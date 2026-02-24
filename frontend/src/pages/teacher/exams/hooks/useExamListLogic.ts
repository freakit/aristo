import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/common/contexts/AuthContext";
import { getExams } from "@/common/services/teacher/getExams";
import { deleteExamSet } from "@/common/services/teacher/deleteExamSet";
import { Exam } from "@/common/types";

// userId가 58인 경우 보여줄 시험 세트 ID 목록 (하드코딩)
const ALLOWED_EXAM_SET_IDS_FOR_USER_58 = [26, 27];

type ListItem =
  | { type: "exam"; exam: Exam }
  | {
      type: "header";
      id: number; // examSetId
      name: string;
      count: number;
      examIds: string[];
    };

export const useExamListLogic = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "recent" | "popular">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSetIds, setExpandedSetIds] = useState<Set<number>>(new Set());
  const itemsPerPage = 15;

  const { user } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsData] = await Promise.all([getExams()]);

      let safeExams: Exam[] = (examsData ?? []).map((e: any) => ({
        ...e,
        studentIds: Array.isArray(e?.studentIds)
          ? e.studentIds
          : Array.isArray(e?.students)
            ? e.students
                .map((s: any) => (typeof s === "string" ? s : s?.id))
                .filter(Boolean)
            : [],
        sections: Array.isArray(e?.sections) ? e.sections : [],
        createdAt: e?.createdAt ? new Date(e.createdAt) : undefined,
        updatedAt: e?.updatedAt ? new Date(e.updatedAt) : undefined,
        examSetName: e.examSetName || undefined,
      }));

      // 특정 사용자(ID 58)에 대한 필터링 적용 (examSetId 기준)
      if (user?.id === 58) {
        safeExams = safeExams.filter(
          (exam) =>
            exam.examSetId &&
            ALLOWED_EXAM_SET_IDS_FOR_USER_58.includes(exam.examSetId),
        );
      }

      setExams(safeExams);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSet = useCallback(
    async (examSetId: number, examSetName: string) => {
      if (
        !window.confirm(
          `"${examSetName}" 세트를 삭제하시겠습니까?\n해당 세트의 모든 시험 데이터가 영구 삭제됩니다.`,
        )
      ) {
        return;
      }
      try {
        await deleteExamSet(examSetId);
        await loadData();
      } catch (err) {
        console.error("세트 삭제 실패:", err);
        alert("세트 삭제 중 오류가 발생했습니다.");
      }
    },
    [loadData],
  );

  const toggleSet = (setId: number) => {
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  // 필터링 및 그룹화 로직
  const getProcessedItems = (): ListItem[] => {
    // 1. 검색 필터링
    let filtered = exams.filter((exam) => {
      const matchesSearch = exam.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // 2. 그룹화 (examSetId 기준)
    const groups: { [key: number]: Exam[] } = {}; // key is examSetId
    const standalone: Exam[] = [];

    filtered.forEach((exam) => {
      if (exam.examSetId) {
        if (!groups[exam.examSetId]) {
          groups[exam.examSetId] = [];
        }
        groups[exam.examSetId].push(exam);
      } else {
        standalone.push(exam);
      }
    });

    // 3. 그룹 정렬 기준 계산
    const groupArray = Object.entries(groups).map(([setIdStr, groupExams]) => {
      const setId = Number(setIdStr);
      const latestDate = Math.max(
        ...groupExams.map((e) =>
          e.createdAt ? new Date(e.createdAt).getTime() : 0,
        ),
      );
      const totalStudents = groupExams.reduce(
        (sum, e) => sum + (e.studentCount ?? e.studentIds?.length ?? 0),
        0,
      );

      // Sort exams within the group (DESCENDING order of set_index)
      const sortedExams = groupExams.sort(
        (a, b) => Number(a.id) - Number(b.id),
      );

      return {
        id: setId,
        exams: sortedExams,
        latestDate,
        totalStudents,
        name: sortedExams[0]?.examSetName || "Unknown Set",
        isSet: true,
      };
    });

    // 4. 독립 시험들도 그룹 형식으로 변환 (sorting logic 통일을 위해)
    const standaloneGroups = standalone.map((exam) => ({
      id: -1, // Dummy ID
      exams: [exam],
      latestDate: exam.createdAt ? new Date(exam.createdAt).getTime() : 0,
      totalStudents: exam.studentCount ?? exam.studentIds?.length ?? 0,
      name: exam.name,
      isSet: false,
    }));

    // 5. 전체 그룹 리스트 합치기 및 정렬
    const allGroups = [...groupArray, ...standaloneGroups];

    allGroups.sort((a, b) => {
      if (filter === "popular") {
        return b.totalStudents - a.totalStudents;
      }
      return b.latestDate - a.latestDate;
    });

    // 6. ListItem 생성 (Flattening with Headers)
    const result: ListItem[] = [];

    allGroups.forEach((group) => {
      if (group.isSet) {
        // Add Header
        result.push({
          type: "header",
          id: group.id,
          name: group.name,
          count: group.exams.length,
          examIds: group.exams.map((e) => String(e.id)),
        });

        // Add Items if expanded
        if (expandedSetIds.has(group.id)) {
          group.exams.forEach((exam) => {
            result.push({ type: "exam", exam });
          });
        }
      } else {
        // Standalone exam
        result.push({ type: "exam", exam: group.exams[0] });
      }
    });

    return result;
  };

  const processedItems = getProcessedItems();

  // 페이지네이션
  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = processedItems.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    exams,
    searchTerm,
    setSearchTerm,
    loading,
    filter,
    setFilter,
    currentPage,
    itemsPerPage,
    expandedSetIds,
    toggleSet,
    handleDeleteSet,
    processedItems,
    paginatedItems,
    totalPages,
    handlePageChange,
  };
};
