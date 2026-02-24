import apiClient from "@/common/services/apiClient";

export const updateNodeAnswer = async (nodeId: number, studentAnswer: string) => {
  return apiClient.put<any>(`/api/trees/nodes/${nodeId}/answer`, { studentAnswer });
};
