import apiClient from "@/common/services/apiClient";

export const signalSessionEnd = async (
  studentInfo: { school: string; registrationNumber: string; name: string },
  examInfo: { name: string }
): Promise<void> => {
  try {
    await apiClient.post("/api/ai-proxy/disconnect", { studentInfo, examInfo });
    console.log("✅ Session end signal processed (or at least sent)");
  } catch (error) {
    console.error("❌ Failed to send session end signal:", error);
    throw error;
  }
};
