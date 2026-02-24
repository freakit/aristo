import apiClient, { ApiResponse } from "@/common/services/apiClient";

export const speechToText = async (
  audioBlob: Blob
): Promise<ApiResponse<{ transcript: string }>> => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");
  formData.append("language", "auto");

  const baseUrl = apiClient.getBaseUrl();

  const retries = 2;
  let delay = 1000;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/openai/stt`, {
        method: "POST",
        body: formData,
      });
      if (response.status >= 500 && i < retries) {
        console.warn(
          `[API Client] STT server error ${response.status}. Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText);
        if (!response.ok)
          return {
            success: false,
            error: data.error || `HTTP Error: ${response.status}`,
          };
        return { success: true, data };
      } catch (e) {
        if (!response.ok) return { success: false, error: responseText };
        return { success: true, data: responseText as any };
      }
    } catch (error) {
      console.error("[API Client] STT request failed:", error);
      if (i < retries) {
        console.warn(
          `[API Client] STT fetch failed. Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "apiErrors.sttFailed",
      };
    }
  }
  return { success: false, error: "apiErrors.sttFailed" };
};
