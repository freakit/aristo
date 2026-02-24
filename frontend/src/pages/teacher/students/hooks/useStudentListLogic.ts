import { useState, useEffect, useCallback } from "react";
import { Exam, Student } from "@/common/types";
import { getExams } from "@/common/services/teacher/getExams";
import { getStudents } from "@/common/services/teacher/getStudents";

type StudentWithExamCount = Student & { examCount: number };

export const useStudentListLogic = () => {
  const [students, setStudents] = useState<StudentWithExamCount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, examsData] = await Promise.all([
        getStudents(),
        getExams(),
      ]);

      const safeStudents: Student[] = (studentsData ?? []).filter(Boolean);
      const safeExams: Exam[] = (examsData ?? []).map((e: any) => ({
        ...e,
        studentIds: Array.isArray(e?.studentIds)
          ? e.studentIds
          : Array.isArray(e?.students)
            ? e.students
                .map((s: any) => (typeof s === "string" ? s : s?.id))
                .filter(Boolean)
            : [],
      }));

      // 각 학생의 시험 참여 횟수 계산
      const studentsWithExamCount: StudentWithExamCount[] = safeStudents.map(
        (student) => ({
          ...student,
          examCount: safeExams.filter((exam) =>
            exam.studentIds?.includes(student.id),
          ).length,
        }),
      );

      setStudents(studentsWithExamCount);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 필터링 및 검색
  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false);

      if (filter === "active") {
        return matchesSearch && student.examCount > 0;
      }
      if (filter === "inactive") {
        return matchesSearch && student.examCount === 0;
      }
      return matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 페이지네이션
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    students,
    searchTerm,
    setSearchTerm,
    loading,
    filter,
    setFilter,
    currentPage,
    filteredStudents,
    paginatedStudents,
    totalPages,
    handlePageChange,
  };
};
