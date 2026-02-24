import apiClient from "@/common/services/apiClient";
import { Student } from "@/common/types";

// Used by: ExamDetailPage, ExamFormPage, ExamReviewPage, MainPage, StudentListPage
export const getStudents = async (): Promise<Student[]> => {
  return apiClient.get<Student[]>("/api/students");
};
