import { BlockBlobClient } from "@azure/storage-blob";
import { getAzureSasToken, saveFileRecord } from "@/common/services/api";
import { ExamLog } from "@/common/types";

export interface UploadOptions {
  school: string;
  studentId: string;
  examName: string;
  onProgress?: (percent: number) => void;
  t: (key: string, params?: any) => string;
}

export const uploadVideo = async (
  blob: Blob,
  fileExtension: string,
  options: UploadOptions
): Promise<string> => {
  const { school, studentId, examName, onProgress, t } = options;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `tracking_${school}_${studentId}_${examName}_${timestamp}.${fileExtension}`;

  const sasResponse = await getAzureSasToken(fileName);
  if (!sasResponse.success || !sasResponse.data) {
    throw new Error(sasResponse.error || t("trackingModal.errors.sasUrlFetchFailed"));
  }

  const blockBlobClient = new BlockBlobClient(sasResponse.data.sasUrl);

  await blockBlobClient.uploadData(blob, {
    blobHTTPHeaders: { blobContentType: blob.type },
    onProgress: (progress) => {
      if (blob.size > 0 && onProgress) {
        const percent = Math.round((progress.loadedBytes / blob.size) * 100);
        onProgress(percent);
      }
    },
  });

  const permanentUrl = blockBlobClient.url.split("?")[0];
  await saveFileRecord({ fileName, fileUrl: permanentUrl });

  return permanentUrl;
};

export const uploadExamLog = async (
  logData: ExamLog,
  school: string,
  t: (key: string) => string
): Promise<void> => {
  try {
    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `examlog_${school}_${logData.meta.studentId}_${logData.meta.examName}_${timestamp}.json`;

    const sasResponse = await getAzureSasToken(fileName, { folder: "gazetrackings" });
    if (sasResponse.success && sasResponse.data) {
      const blockBlobClient = new BlockBlobClient(sasResponse.data.sasUrl);
      await blockBlobClient.uploadData(blob, {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
    }
  } catch (e) {
    console.error("Failed to upload exam log JSON:", e);
    // Log upload is non-critical, we don't necessarily want to block the user if it fails
  }
};
