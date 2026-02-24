import apiClient from "@/common/services/apiClient";
import { File as DbFile } from "@/common/types";

// Used by: ExamFormPage, ExamSetShellPage, ExamCompletionPage, HandAndGazeTrackingModal
export const saveFileRecord = async (fileData: {
  fileName: string;
  fileUrl: string;
}): Promise<DbFile> => {
  const data = await apiClient.post<DbFile>("/api/files", fileData);
  return data;
};
