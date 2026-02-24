import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Section, Student, File as DbFile } from "@/common/types";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { getStudents } from "@/common/services/teacher/getStudents";
import { getExamById } from "@/common/services/api/getExamById";
import { getExamAttachments } from "@/common/services/api/getExamAttachments";
import { updateExam } from "@/common/services/teacher/updateExam";
import { isoToLocalInputValue } from "@/common/utils/isoToLocalInputValue";
import { localToUtcIso } from "@/common/utils/localToUtcIso";
import { uploadAndSaveFile } from "@/common/utils/uploadAndSaveFile";
import { fileRecordToAttachment } from "@/common/utils/fileRecordToAttachment";

export type SectionV2 = Section & {
  chapter: number | null;
  openAt: string;
  blockAt: string;
  duration?: number;
};

export const useExamEditLogic = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [examName, setExamName] = useState("");
  const [sections, setSections] = useState<SectionV2[]>([
    {
      id: "1",
      title: "",
      content: "",
      attachments: [],
      chapter: null,
      openAt: "",
      blockAt: "",
      duration: undefined,
    },
  ]);

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [visibleAtInput, setVisibleAtInput] = useState<string>("");
  const [sasUrls, setSasUrls] = useState<Record<string, string>>({});

  const loadStudents = async () => {
    try {
      const studentList = await getStudents();
      setStudents(studentList);
    } catch (error) {
      console.error("학생 목록 로드 오류:", error);
      setError("학생 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const loadExam = async (id: string) => {
    setLoading(true);
    try {
      const [exam, attachments] = await Promise.all([
        getExamById(id),
        getExamAttachments(id),
      ]);

      if (!exam) {
        setError("시험을 찾을 수 없습니다.");
        navigate("/exams");
        return;
      }

      const fileMap = new Map<number, DbFile>();
      (attachments || []).forEach((file) => {
        fileMap.set(Number(file.id), file);
      });

      setExamName(exam.name ?? "");
      setVisibleAtInput(isoToLocalInputValue(exam.visibleAt) || "");
      setSelectedStudents(
        Array.isArray(exam.studentIds) ? exam.studentIds : [],
      );

      const first = (exam.sections && exam.sections[0]) || {
        title: "",
        content: "",
        attachments: [],
        attachmentFileIds: [],
      };

      const attachmentFileIds = (first as any).attachmentFileIds || [];
      const hydratedAttachments = attachmentFileIds
        .map((fileId: number) => {
          const fileRecord = fileMap.get(Number(fileId));
          if (fileRecord) {
            return fileRecordToAttachment(fileRecord as any);
          }
          return null;
        })
        .filter(Boolean);

      setSections([
        {
          id: String(first.id ?? "1"),
          title: first.title ?? "",
          content: first.content ?? "",
          attachments: hydratedAttachments,
          chapter: exam.chapter == null ? null : Number(exam.chapter),
          openAt: isoToLocalInputValue(exam.openAt) || "",
          blockAt: isoToLocalInputValue(exam.blockAt) || "",
          duration: exam.duration ?? undefined,
        },
      ]);
    } catch (error) {
      console.error("시험 로드 오류:", error);
      setError("시험 정보를 불러오는 중 오류가 발생했습니다.");
      navigate("/exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    if (examId) {
      loadExam(examId);
    }
  }, [examId]);

  useEffect(() => {
    const fetchAllSasUrls = async () => {
      const allAttachments = sections.flatMap((sec) => sec.attachments || []);
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
  }, [sections, sasUrls]);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registrationNumber.includes(searchTerm),
  );

  const filteredStudentIds = filteredStudents.map((s) => s.id);
  const areAllFilteredStudentsSelected =
    filteredStudentIds.length > 0 &&
    filteredStudentIds.every((id) => selectedStudents.includes(id));

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleToggleAllStudents = () => {
    if (areAllFilteredStudentsSelected) {
      setSelectedStudents((prev) =>
        prev.filter((id) => !filteredStudentIds.includes(id)),
      );
    } else {
      setSelectedStudents((prev) => {
        const newSelected = new Set([...prev, ...filteredStudentIds]);
        return Array.from(newSelected);
      });
    }
  };

  const updateSection = (index: number, field: keyof SectionV2, value: any) => {
    setSections((prev) =>
      prev.map((section, i) =>
        i === index ? { ...section, [field]: value } : section,
      ),
    );
  };

  // Edit mode only supports single section for now?
  // Based on current logic "if (isEdit) { updateExam(payload with s0) }"
  // The edit logic in Page.tsx was only taking s0.
  // We will keep 'addSection'/'removeSection' but note that updateExam only uses index 0 currently.
  // Wait, if users add more sections during edit, the current backend mapping in Page.tsx was ignoring them:
  // "const s0 = sections[0]; ... sections: [{...}]"
  // So adding sections in Edit mode is effectively disabled or broken in the original code.
  // We should probably respect that limitation or fix it.
  // For now, I'll strictly replicate the original behavior but maybe hide the add button in the UI if it's edit mode.

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: "",
        content: "",
        attachments: [],
        chapter: null,
        openAt: "",
        blockAt: "",
        duration: undefined,
      } as SectionV2,
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleFileInputChange = async (
    sectionIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      const file = e.target.files?.[0] as globalThis.File | undefined;
      e.currentTarget.value = "";
      if (!file) return;

      setError("");
      const newFileRecord = await uploadAndSaveFile(file);
      const newAttachment = fileRecordToAttachment(newFileRecord);

      setSections((prev) =>
        prev.map((s, i) =>
          i === sectionIndex
            ? { ...s, attachments: [...(s.attachments ?? []), newAttachment] }
            : s,
        ),
      );
      setSuccess("파일이 첨부되었습니다.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "파일 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveAttachment = (
    sectionIndex: number,
    fileId: number | string,
  ) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              attachments: (s.attachments ?? []).filter((f) => f.id !== fileId),
            }
          : s,
      ),
    );
  };

  const handleFileAddClick = (sectionIndex: number) => {
    const el = document.getElementById(
      `file-input-${sectionIndex}`,
    ) as HTMLInputElement | null;
    el?.click();
  };

  const validateForm = () => {
    if (!examName.trim()) {
      setError("시험명을 입력해주세요.");
      return false;
    }
    if (sections.some((s) => !s.title?.trim() || !s.content?.trim())) {
      setError("모든 섹션의 제목과 내용을 입력해주세요.");
      return false;
    }
    if (!visibleAtInput) {
      setError("공개 시각을 입력해주세요.");
      return false;
    }
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const o = new Date(s.openAt || "");
      const b = new Date(s.blockAt || "");
      if ([o, b].some((d) => isNaN(d.getTime())) || !(o < b)) {
        setError(`섹션 ${i + 1}: 오픈 < 차단 순서가 맞는지 확인해주세요.`);
        return false;
      }
      if (s.duration == null || Number(s.duration) < 1) {
        setError(`섹션 ${i + 1}: 시험 시간(분)을 1 이상으로 입력해주세요.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!examId) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const s0 = sections[0];
      const updatePayload = {
        name: examName.trim(),
        visibleAt: localToUtcIso(visibleAtInput),
        duration: Number(s0.duration),
        chapter: s0.chapter == null ? null : Number(s0.chapter),
        openAt: localToUtcIso(s0.openAt),
        blockAt: localToUtcIso(s0.blockAt),
        sections: [
          {
            title: s0.title,
            content: s0.content,
            attachmentFileIds: (s0.attachments ?? []).map((a) =>
              Number(a.fileId),
            ),
          },
        ],
        studentIds: selectedStudents,
      };
      await updateExam(examId, updatePayload as any);
      setSuccess("시험이 성공적으로 수정되었습니다! 🎉");

      setTimeout(() => navigate("/exams"), 1200);
    } catch (error) {
      console.error("시험 저장 오류:", error);
      setError("시험 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/exams/${examId}`);
  };

  return {
    examName,
    setExamName,
    sections,
    updateSection,
    addSection,
    removeSection,
    visibleAtInput,
    setVisibleAtInput,
    students,
    selectedStudents,
    searchTerm,
    setSearchTerm,
    filteredStudents,
    areAllFilteredStudentsSelected,
    handleStudentSelect,
    handleToggleAllStudents,
    handleFileInputChange,
    handleRemoveAttachment,
    handleFileAddClick,
    handleSubmit,
    handleCancel,
    loading,
    isSubmitting,
    error,
    success,
    sasUrls,
  };
};
