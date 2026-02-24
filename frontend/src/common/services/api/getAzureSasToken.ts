import apiClient, { ApiResponse } from "@/common/services/apiClient";

// Used by: ExamReviewPage, ExamFormPage, ExamDetailPage, StudentAssistantPage, ExamSetShellPage, ExamCompletionPage, HandAndGazeTrackingModal, AnswerCorrectionModal
export const getAzureSasToken = async (
  fileName: string,
  options?: {
    folder?: "attachments" | "recordings" | "gazetrackings" | "answeraudios";
  }
): Promise<ApiResponse<{ sasUrl: string }>> => {
  const folder = options?.folder || "recordings";
  const url = `/api/azure/generate-sas-token?fileName=${encodeURIComponent(
    fileName
  )}&folder=${folder}`;

  const data = await apiClient.get<{ sasUrl: string }>(url);
  return { success: true, data };
};
