import apiClient from "@/common/services/apiClient";

export const logAnswerChange = async (payload: {
  examStudentId: number | string;
  oldAnswer: string;
  newAnswer: string;
  audioUrl?: string;
  turn: number;
}) => {
  try {
    const data = await apiClient.post<any>("/api/answer-changes", payload);
    return { success: true, data };
  } catch (error: any) {
    console.warn("Failed to log answer change:", error.message);
    return { success: false, error: error.message };
  }
};
