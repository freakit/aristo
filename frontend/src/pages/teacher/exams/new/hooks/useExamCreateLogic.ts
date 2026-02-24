import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "@/common/i18n";
import { Section, Student, File as DbFile } from "@/common/types";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { getStudents } from "@/common/services/teacher/getStudents";
import { getExamById } from "@/common/services/api/getExamById";
import { getExamAttachments } from "@/common/services/api/getExamAttachments";
import { updateExam } from "@/common/services/teacher/updateExam";
import { addExamsMulti } from "../addExamsMulti";
import { isoToLocalInputValue } from "@/common/utils/isoToLocalInputValue";
import { localToUtcIso } from "@/common/utils/localToUtcIso";
import { uploadAndSaveFile } from "@/common/utils/uploadAndSaveFile";
import { fileRecordToAttachment } from "@/common/utils/fileRecordToAttachment";
import { RagSource } from "@/common/services/api/getRagSources";
import { useAuth } from "@/common/contexts/AuthContext";

// V2: 폼 전용 섹션 타입
export type SectionV2 = Section & {
  vectorIds: number[];
  openAt: string;
  blockAt: string;
  duration: number | undefined;
};

export const useExamCreateLogic = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(examId);

  const [examName, setExamName] = useState("");
  const [sections, setSections] = useState<SectionV2[]>([
    {
      id: "1",
      title: "",
      content: "",
      attachments: [],
      vectorIds: [],
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

  // RAG Sources
  const [availableSources, setAvailableSources] = useState<RagSource[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      import("@/common/services/api/getRagSources").then(
        ({ getRagSources }) => {
          getRagSources(user.id).then((sources) => {
            setAvailableSources(sources);
          });
        },
      );
    }
  }, [user]);

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

      // ✅ 타입 안전하게 처리
      const mappedAttachments = ((first.attachmentFileIds || []) as number[])
        .map((fid: number) => fileMap.get(fid))
        .filter((f): f is DbFile => f !== undefined)
        .map((f: DbFile) => fileRecordToAttachment(f));

      const sectionData: SectionV2 = {
        id: (first as Section).id?.toString() || "1", // ✅ 타입 단언
        title: first.title || "",
        content: first.content || "",
        attachments: mappedAttachments,
        vectorIds: exam.ragSourceIds || exam.vectorIds || [],
        openAt: isoToLocalInputValue(exam.openAt) || "",
        blockAt: isoToLocalInputValue(exam.blockAt) || "",
        duration: exam.duration,
      };

      setSections([sectionData]);
      setLoading(false);
    } catch (err) {
      console.error("시험 로드 오류:", err);
      setError("시험 정보를 불러오는 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    if (isEdit && examId) {
      loadExam(examId);
    }
  }, [isEdit, examId]);

  const handleSubmit = async () => {
    if (!examName.trim()) {
      setError(t("examNameRequired"));
      return;
    }
    if (!visibleAtInput) {
      setError(t("visibleAtRequired"));
      return;
    }

    // Verify all sections have required fields
    const invalidSectionIndex = sections.findIndex(
      (section) =>
        !section.openAt || !section.blockAt || section.duration === undefined,
    );

    if (invalidSectionIndex !== -1) {
      setError(
        `${invalidSectionIndex + 1}번째 시험의 필수 정보를 입력해주세요.`,
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Process all sections (upload attachments and format payload)
      const itemsPayload = await Promise.all(
        sections.map(async (section) => {
          // Handle attachments for each section
          const attachmentFileIds = await Promise.all(
            (section.attachments || []).map(async (att) => {
              if (att.file && att.file instanceof File) {
                const uploadedFile = await uploadAndSaveFile(att.file);
                return uploadedFile.id;
              }
              return att.id || null;
            }),
          ).then((ids) => ids.filter((id): id is number => id !== null));

          return {
            title: section.title || "",
            content: section.content || "",
            attachmentFileIds,
            openAt: localToUtcIso(section.openAt),
            blockAt: localToUtcIso(section.blockAt),
            duration: section.duration!,
            vectorIds: section.vectorIds,
            // ragSourceIds: section.vectorIds, // Backward compatibility if needed
          };
        }),
      );

      if (isEdit && examId) {
        // Edit mode: currently updates a specific exam (single)
        // Note: If 'sections' has multiple items in edit mode, this logic might need review,
        // but typically edit page loads a single exam.
        // Preserving existing logic for single exam update but using the first item of processed payload.
        const firstItem = itemsPayload[0];
        const payload = {
          name: examName,
          visibleAt: localToUtcIso(visibleAtInput),
          openAt: firstItem.openAt,
          blockAt: firstItem.blockAt,
          duration: firstItem.duration,
          chapter: null,
          sections: [
            {
              title: firstItem.title,
              content: firstItem.content,
              attachmentFileIds: firstItem.attachmentFileIds,
            },
          ],
          studentIds: selectedStudents,
          vectorIds: firstItem.vectorIds,
        };

        await updateExam(Number(examId), payload);
        setSuccess(t("examUpdated"));
      } else {
        // Create mode: addExamsMulti with all items
        await addExamsMulti({
          name: examName,
          visibleAt: localToUtcIso(visibleAtInput),
          items: itemsPayload,
          studentIds: selectedStudents,
        });
        setSuccess(t("examCreated"));
      }

      setTimeout(() => navigate("/exams"), 1500);
    } catch (err) {
      console.error("시험 생성/수정 오류:", err);
      setError(t("examSaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.registrationNumber?.includes(searchTerm),
  );

  const areAllFilteredStudentsSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudents.includes(s.id));

  const handleStudentSelect = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };

  const handleToggleAllStudents = () => {
    if (areAllFilteredStudentsSelected) {
      const idsToRemove = filteredStudents.map((s) => s.id);
      setSelectedStudents((prev) =>
        prev.filter((id) => !idsToRemove.includes(id)),
      );
    } else {
      const idsToAdd = filteredStudents.map((s) => s.id);
      setSelectedStudents((prev) => [
        ...Array.from(new Set([...prev, ...idsToAdd])),
      ]);
    }
  };

  // Section Management
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: Date.now().toString(), // Temporary ID
        title: "",
        content: "",
        attachments: [],
        vectorIds: [],
        openAt: "",
        blockAt: "",
        duration: undefined,
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, key: string, value: any) => {
    setSections((prev) => {
      const newSections = [...prev];
      newSections[index] = { ...newSections[index], [key]: value };
      return newSections;
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Attachments
  const handleFileAddClick = (index: number) => {
    const fileInput = document.getElementById(`file-input-${index}`);
    if (fileInput) fileInput.click();
  };

  const handleFileInputChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create temporary attachment object
    // @ts-ignore
    const newAttachment: any = {
      id: Date.now(), // Temp ID
      sectionId: 0,
      fileId: 0,
      file: file, // Store actual File object
    };

    setSections((prev) => {
      const newSections = [...prev];
      const section = newSections[index];
      newSections[index] = {
        ...section,
        attachments: [...(section.attachments || []), newAttachment],
      };
      return newSections;
    });

    e.target.value = "";
  };

  const handleRemoveAttachment = (
    sectionIndex: number,
    attachmentIdOrFileId: string | number,
  ) => {
    setSections((prev) => {
      const newSections = [...prev];
      const section = newSections[sectionIndex];
      // id가 일치하거나 file.id가 일치하는 경우 제거
      newSections[sectionIndex] = {
        ...section,
        attachments: (section.attachments || []).filter((att) => {
          const id = att.id;
          const fileId = att.file?.id;
          // 둘 중 하나라도 일치하면 제거 대상
          if (id === attachmentIdOrFileId) return false;
          if (fileId === attachmentIdOrFileId) return false;
          return true;
        }),
      };
      return newSections;
    });
  };

  return {
    examName,
    setExamName,
    sections,
    setSections,
    selectedStudents,
    setSelectedStudents,
    students,
    searchTerm,
    setSearchTerm,
    filteredStudents,
    areAllFilteredStudentsSelected,
    handleStudentSelect,
    handleToggleAllStudents,
    addSection,
    removeSection,
    updateSection,
    handleFileAddClick,
    handleFileInputChange,
    handleRemoveAttachment,
    handleCancel,
    isSubmitting,
    error,
    success,
    loading,
    visibleAtInput,
    setVisibleAtInput,
    handleSubmit,
    isEdit,
    sasUrls,
    setSasUrls,
    availableSources,
  };
};
