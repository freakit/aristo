import apiClient from "@/common/services/apiClient";
import { QA } from "@/common/types";

// Used by: ExamDetailPage
export const getQAList = async (examStudentId: string): Promise<QA[]> => {
  const data = await apiClient.get<QA[]>(`/api/trees/qa-list/${examStudentId}`);
  return data;
};
