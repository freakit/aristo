import apiClient, { ApiResponse } from "@/common/services/apiClient";

export const completeExam = async (
  examStudentId: string
): Promise<ApiResponse<{ success: boolean }>> => {
  try {
    const data = await apiClient.put<{ success: boolean }>(
      `/api/exams/complete/${examStudentId}`
    );
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
