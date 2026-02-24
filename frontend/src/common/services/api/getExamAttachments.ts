import apiClient from "@/common/services/apiClient";
import { File as DbFile } from "@/common/types";

// Used by: ExamDetailPage, ExamFormPage, StudentAssistantPage
export const getExamAttachments = async (
  examId: string | number
): Promise<DbFile[]> => {
  const url = `/api/exams/${examId}/attachments`;
  const data = await apiClient.get<any>(url);
  
  const files: DbFile[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];

  if (!Array.isArray(files)) {
    throw new Error("apiErrors.attachment_fetch_failed");
  }

  return files;
};
