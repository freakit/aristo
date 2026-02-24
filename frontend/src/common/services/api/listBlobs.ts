import apiClient, { ApiResponse } from "@/common/services/apiClient";

// Used by: ExamReviewPage, AnswerCorrectionModal
export const listBlobs = async (
  prefix: string,
  options?: {
    folder?: "attachments" | "recordings" | "gazetrackings" | "answeraudios";
  }
): Promise<ApiResponse<{ blobs: string[] }>> => {
  const folder = options?.folder || "recordings";
  const url = `/api/azure/list-blobs?folder=${folder}&prefix=${encodeURIComponent(
    prefix
  )}`;

  const data = await apiClient.get<{ blobs: string[] }>(url);
  return { success: true, data };
};
