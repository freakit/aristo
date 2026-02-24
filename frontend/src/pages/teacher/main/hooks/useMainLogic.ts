import { useState, useEffect, useCallback } from "react";
import { Exam, Student } from "@/common/types";
import { getExams } from "@/common/services/teacher/getExams";
import { getStudents } from "@/common/services/teacher/getStudents";

export const useMainLogic = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsData, studentsData] = await Promise.all([
        getExams(),
        getStudents(),
      ]);

      const safeExams: Exam[] = (examsData ?? []).map((e: any) => ({
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
      }));

      const safeStudents: Student[] = (studentsData ?? []).filter(Boolean);

      setExams(safeExams);
      setStudents(safeStudents);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      setExams([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 계산된 통계
  const totalParticipants = exams.reduce(
    (total, exam) => total + (exam.studentCount ?? 0),
    0,
  );
  const activeExams = exams.filter(
    (e) => e.studentCount && e.studentCount > 0,
  ).length;
  const recentExams = exams.slice(0, 5);
  const averageParticipants =
    exams.length > 0 ? Math.round(totalParticipants / exams.length) : 0;

  return {
    exams,
    students,
    loading,
    totalParticipants,
    activeExams,
    recentExams,
    averageParticipants,
  };
};
