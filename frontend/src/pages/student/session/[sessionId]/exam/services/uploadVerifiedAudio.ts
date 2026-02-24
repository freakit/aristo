import { getAzureSasToken } from "@/common/services/api";

// 오디오 업로드
export const uploadVerifiedAudio = async (
  blob: Blob,
  studentRegistrationNumber: string,
  examName: string
): Promise<string | null> => {
  try {
    const ext = blob.type.includes("mp3") ? "mp3" : "webm";
    const uuid = crypto.randomUUID();
    const fileName = `answer_audio_${studentRegistrationNumber}_${examName}_${uuid}.${ext}`;

    const sasRes = await getAzureSasToken(fileName, {
      folder: "answeraudios",
    });

    if (!sasRes.success || !sasRes.data?.sasUrl) {
      console.error("❌ SAS Token failed");
      return null;
    }

    const sasUrl = sasRes.data.sasUrl;
    const uploadRes = await fetch(sasUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": blob.type,
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      console.error("❌ Azure Upload failed:", uploadRes.status);
      return null;
    }

    return sasUrl.split("?")[0];
  } catch (error) {
    console.error("❌ Upload exception:", error);
    return null;
  }
};
