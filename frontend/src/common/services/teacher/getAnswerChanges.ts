import apiClient from "@/common/services/apiClient";

// Used by: ExamDetailPage
export const getAnswerChanges = async (
  examStudentId: string,
  turn: number
): Promise<any[]> => {
  const data = await apiClient.get<any[]>(
    `/api/answer-changes/${examStudentId}/${turn}`
  );
  return data;
};
