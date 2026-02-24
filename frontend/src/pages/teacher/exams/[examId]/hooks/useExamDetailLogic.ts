import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Exam,
  Student,
  StudentExamRecord,
  Section,
  File as DbFile,
} from "@/common/types";
import { getExamAttachments } from "@/common/services/api/getExamAttachments";
import { getExamById } from "@/common/services/api/getExamById";
import { getStudents } from "@/common/services/teacher/getStudents";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { findExamStudentForTeacher } from "@/common/services/teacher/findExamStudentForTeacher";
import { getQAList } from "@/common/services/api/getQAList";
import { updateExam } from "@/common/services/teacher/updateExam";
import { getAnswerChanges } from "@/common/services/teacher/getAnswerChanges";
import { useTranslation } from "@/common/i18n";
import { AnswerChange } from "../components/AnswerCorrectionModal";
import { formatLocalDateTime } from "@/common/utils/formatLocalDateTime";
import {
  getExamStatus as getStatus,
  ExamStatus,
  statusText,
} from "../services/getExamStatus";
import { toIso } from "@/common/utils/ensureUtcIso";

export const useExamDetailLogic = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedNewStudents, setSelectedNewStudents] = useState<string[]>([]);
  const [selectedStudentForQA, setSelectedStudentForQA] = useState<
    string | null
  >(null);
  const [selectedStudentQuestions, setSelectedStudentQuestions] =
    useState<StudentExamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sasUrls, setSasUrls] = useState<Record<string, string>>({});
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [currentCorrections, setCurrentCorrections] = useState<AnswerChange[]>(
    [],
  );

  const status: ExamStatus = getStatus(exam);

  const fetchExamAttachmentMap = useCallback(async (exId: number) => {
    const result = await getExamAttachments(exId);
    const list = result as DbFile[];
    const map = new Map<number, DbFile>();
    (list || []).forEach((f: any) => {
      const idNum = Number(f?.id);
      if (Number.isFinite(idNum)) map.set(idNum, f as DbFile);
    });
    return map;
  }, []);

  const hydrateExamAttachments = useCallback(
    async (examData: Exam): Promise<Exam> => {
      if (!examData?.sections || !Array.isArray(examData.sections))
        return examData;

      const secMeta = (examData.sections ?? []).map((sec) => {
        const fromObjs = (sec.attachments ?? [])
          .map((a: any) => Number(a?.fileId))
          .filter(Boolean);
        const fromIds =
          (sec as any).attachmentFileIds?.map((v: any) => Number(v)) ?? [];
        const fileIds = Array.from(new Set([...fromObjs, ...fromIds])).filter(
          Number.isFinite,
        );
        return { sec, fileIds };
      });

      const fileMap = await fetchExamAttachmentMap(
        Number((examData as any).id),
      );

      const newSections = secMeta.map(({ sec, fileIds }) => {
        const baseAtts =
          sec.attachments && sec.attachments.length > 0
            ? sec.attachments
            : fileIds.map((fid, i) => ({
                id: `${sec.id ?? "sec"}-att-${i}`,
                fileId: fid,
              }));

        const hydrated = baseAtts.map((a: any, i: number) => {
          const fid = Number(a.fileId);
          const meta = fileMap.get(fid);
          return {
            ...a,
            id: a.id ?? `${sec.id ?? "sec"}-att-${i}`,
            file: meta,
          };
        });

        return { ...sec, attachments: hydrated as any };
      });

      return { ...examData, sections: newSections };
    },
    [fetchExamAttachmentMap],
  );

  const loadData = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const [examData, studentsData] = await Promise.all([
        getExamById(examId),
        getStudents(),
      ]);

      if (!examData) {
        navigate("/exams");
        return;
      }

      const hydrated = await hydrateExamAttachments(examData);
      setExam(hydrated);

      // 배정된 학생만 students에, 미배정 학생만 availableStudents에
      const assignedIds = (examData.studentIds ?? []) as string[];
      const assigned = studentsData.filter((st) => assignedIds.includes(st.id));
      const available = studentsData.filter(
        (st) => !assignedIds.includes(st.id),
      );

      setStudents(assigned);
      setAvailableStudents(available);
    } catch (error) {
      console.error("❌ [Detail] 데이터 로드 오류:", error);
      navigate("/exams");
    } finally {
      setLoading(false);
    }
  }, [examId, navigate, hydrateExamAttachments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const fetchAllSasUrls = async () => {
      if (!exam?.sections) return;
      const allAttachments = exam.sections.flatMap(
        (sec) => sec.attachments || [],
      );
      if (allAttachments.length === 0) return;

      const promises = allAttachments
        .filter((att) => att.file && !sasUrls[att.file.id])
        .map(async (att) => {
          if (!att.file) return null;
          try {
            const response = await getAzureSasToken(att.file.fileName, {
              folder: "attachments",
            });
            if (response.success && response.data?.sasUrl) {
              return { fileId: att.file.id, sasUrl: response.data.sasUrl };
            }
          } catch (error) {
            console.error(
              `Failed to get SAS token for ${att.file.fileName}:`,
              error,
            );
          }
          return null;
        });

      const results = await Promise.all(promises);
      const newUrls: Record<string, string> = {};
      results.forEach((result) => {
        if (result) newUrls[result.fileId] = result.sasUrl;
      });

      if (Object.keys(newUrls).length > 0) {
        setSasUrls((prev) => ({ ...prev, ...newUrls }));
      }
    };

    fetchAllSasUrls();
  }, [exam, sasUrls]);

  const getStudentInfo = (studentId: string) =>
    students.find((s) => s.id === studentId);

  const handleStudentViewClick = async (studentId: string) => {
    const student = getStudentInfo(studentId);
    if (!student || !exam) return;

    setSelectedStudentForQA(studentId);
    setLoadingQuestions(true);
    try {
      const sessionData = await findExamStudentForTeacher(String(exam.id), student.id, {
        status: "completed",
      });

      if (sessionData && sessionData.examStudentId) {
        const qaListData = await getQAList(
          sessionData.examStudentId.toString(),
        );
        const finalRecord: StudentExamRecord = {
          ...sessionData,
          questions: qaListData.map((qa) => qa.question),
          answers: qaListData.map((qa) => qa.answer),
          qaList: qaListData,
        };
        setSelectedStudentQuestions(finalRecord);
      } else {
        setSelectedStudentQuestions(null);
      }
    } catch (error) {
      console.error("질문 기록 로드 오류:", error);
      setSelectedStudentQuestions(null);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAddStudents = async () => {
    if (selectedNewStudents.length === 0 || !exam) return;
    try {
      const section0 = (exam.sections ?? [])[0] ?? {
        title: "",
        content: "",
        attachments: [],
      };
      const updatePayload = {
        name: exam.name?.trim() ?? "",
        visibleAt: toIso(exam.visibleAt),
        openAt: toIso(exam.openAt),
        blockAt: toIso(exam.blockAt),
        duration: exam.duration,
        chapter: exam.chapter == null ? null : Number(exam.chapter),
        sections: [
          {
            title: section0.title ?? "",
            content: section0.content ?? "",
            attachmentFileIds: (section0.attachments ?? [])
              .map((a: any) => Number(a.fileId))
              .filter(Boolean),
          },
        ],
        studentIds: [...(exam.studentIds ?? []), ...selectedNewStudents],
      };

      await updateExam(exam.id, updatePayload as any);
      setSelectedNewStudents([]);
      setSearchTerm("");
      loadData();
    } catch (error) {
      console.error("학생 추가 오류:", error);
      alert(t("examDetail.addStudentError"));
    }
  };

  const getDisplaySections = (): Section[] => {
    if (exam?.sections?.length) return exam.sections;
    const anyExam = exam as any;
    if (exam && (anyExam?.content || anyExam?.attachments?.length)) {
      return [
        {
          id: String(exam.id),
          title: exam.name,
          content: anyExam.content ?? "",
          attachments: Array.isArray(anyExam.attachments)
            ? anyExam.attachments
            : [],
        } as Section,
      ];
    }
    return [];
  };

  const toggleNewStudentSelection = (studentId: string) => {
    setSelectedNewStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleShowCorrections = async (turn: number) => {
    if (!selectedStudentQuestions) return;
    try {
      const changes = await getAnswerChanges(
        selectedStudentQuestions.examStudentId.toString(),
        turn,
      );
      setCurrentCorrections(changes);
      setIsCorrectionModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch corrections:", err);
    }
  };

  return {
    t,
    examId,
    exam,
    students,
    availableStudents,
    selectedNewStudents,
    selectedStudentForQA,
    setSelectedStudentForQA,
    selectedStudentQuestions,
    loading,
    loadingQuestions,
    searchTerm,
    setSearchTerm,
    sasUrls,
    isCorrectionModalOpen,
    setIsCorrectionModalOpen,
    currentCorrections,
    status,
    statusText,
    formatLocalDateTime,
    getStudentInfo,
    handleStudentViewClick,
    handleAddStudents,
    getDisplaySections,
    toggleNewStudentSelection,
    handleShowCorrections,
    navigate,
  };
};
