import apiClient from "@/common/services/apiClient";
import { ExamStudentSession } from "@/common/types";

// Used by: StudentAssistantPage, ExamCompletionPage
export const getExamSession = async (
  examStudentId: string | number,
): Promise<ExamStudentSession> => {
  const data = await apiClient.get<ExamStudentSession>(
    `/api/exams/session/${examStudentId}`,
  );
  return data;
};
