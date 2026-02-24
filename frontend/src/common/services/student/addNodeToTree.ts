import apiClient from "@/common/services/apiClient";

export const addNodeToTree = async (payload: { parentNodeId: number; newNodeData: any }) => {
  return apiClient.post<any>("/api/trees/nodes", payload);
};
