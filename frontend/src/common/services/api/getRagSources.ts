import apiClient from "@/common/services/apiClient";

export interface RagSource {
  file_id: number;
  uid: number;
  source: string;
  uploaded_at: string;
  key: string;
  count?: number;
}

export const getRagSources = async (uid?: number): Promise<RagSource[]> => {
  try {
    // 타입을 명시적으로 지정
    const response = await apiClient.get<RagSource[]>(
      `/api/rag/sources${uid ? `?uid=${uid}` : ""}`
    );
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error("Failed to fetch RAG sources:", error);
    return [];
  }
};