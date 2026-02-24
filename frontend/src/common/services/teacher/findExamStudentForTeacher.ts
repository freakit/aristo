import apiClient from "@/common/services/apiClient";
import { StudentExamRecord } from "@/common/types";

export const findExamStudentForTeacher = async (
  examId: string,
  studentId: string,
  opts?: { status?: "completed" | "in_progress" | "pending" }
): Promise<StudentExamRecord | null> => {
  try {
    const data = await apiClient.get<StudentExamRecord>(
      `/api/exams/session/find?examId=${examId}&studentId=${studentId}`
    );
    return data || null;
  } catch (error) {
    console.error("Failed to find exam student record:", error);
    return null;
  }
};
