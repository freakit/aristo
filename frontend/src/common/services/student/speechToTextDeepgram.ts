import apiClient from "@/common/services/apiClient";

// Deepgram file-based STT (Nova-3)
export const speechToTextDeepgram = async (
  audioBlob: Blob
): Promise<{ success: boolean; data?: { transcript: string }; error?: string }> => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");

  const retries = 2;
  let delay = 1000;
  
  // Need to bypass apiClient.post which expects JSON body usually, or use raw fetch if apiClient doesn't support FormData?
  // apiClient uses fetchWithTimeout which supports RequestInit.
  // BUT apiClient.post stringifies body!
  // We need a way to send FormData via apiClient or directly.
  // Direct fetch is cleaner here or extending apiClient to support raw body.
  // Given we are cleaning apiClient, let's use fetch wrapped with timeout logic locally or expose apiClient.fetch?
  // Or just use fetch.
  
  // Re-implementing retry logic here
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const baseUrl = apiClient.getBaseUrl(); // Assuming getBaseUrl remains public

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/deepgram/stt`, {
        method: "POST",
        body: formData,
        headers: {
            // No Content-Type for FormData, browser sets it with boundary
        }
      });
      
      if (response.status >= 500 && i < retries) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      
      const responseText = await response.text();
       try {
          const data = JSON.parse(responseText);
          if (!response.ok) {
            return {
              success: false,
              error: data.error || `HTTP Error: ${response.status}`,
            };
          }
          return { success: true, data };
        } catch (error) {
          if (!response.ok) {
            return { success: false, error: responseText };
          }
          return { success: true, data: responseText as any };
        }

    } catch (error) {
      if (i < retries) {
        await sleep(delay);
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
