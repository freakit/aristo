import apiClient from "@/common/services/apiClient";

// Used by: deepgramSpeechService.ts
export const getDeepgramKey = async (): Promise<string> => {
  const data = await apiClient.get<{ key: string }>("/api/deepgram/key");
  if (!data?.key) {
      throw new Error("Failed to fetch Deepgram key");
  }
  return data.key;
};
