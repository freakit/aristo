import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { saveFileRecord } from "@/common/services/api/saveFileRecord";
import { FileRecord } from "@/common/types";

// Azure 업로드 + DB 저장
export const uploadAndSaveFile = async (
  file: globalThis.File
): Promise<FileRecord> => {
  // 1. SAS 토큰 발급
  const sasRes = await getAzureSasToken(file.name, {
    folder: "attachments",
  });
  if (!sasRes.success || !sasRes.data?.sasUrl) {
    throw new Error("SAS 토큰 발급 실패");
  }

  const sasUrl = sasRes.data.sasUrl;

  // 2. Azure 직접 업로드
  const uploadRes = await fetch(sasUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Azure 업로드 실패: ${uploadRes.statusText}`);
  }

  // 3. DB에 저장
  const cleanUrl = sasUrl.split("?")[0];
  const dbFile = await saveFileRecord({
    fileName: file.name,
    fileUrl: cleanUrl,
  });

  return {
    id: dbFile.id,
    fileName: dbFile.fileName,
    fileUrl: dbFile.fileUrl,
  };
};
