import apiClient from "@/common/services/apiClient";
import { Exam } from "@/common/types";

// Used by: ExamListPage, MainPage, StudentListPage
export const getExams = async (): Promise<Exam[]> => {
  const data = await apiClient.get<any[]>("/api/exams");
  return data.map((exam) => ({
    ...exam,
    chapter: exam?.chapter == null ? null : Number(exam.chapter),
    createdAt: new Date(exam.createdAt),
    updatedAt: new Date(exam.updatedAt),
  }));
};
