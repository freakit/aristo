import apiClient from "@/common/services/apiClient";

export const initTree = async (payload: {
  examStudentId: number;
  sectionId: number;
  baseQuestionNodeData: any;
}) => {
  const data = await apiClient.post<{
    rootNodeId: number;
    baseQuestionNodeId: number;
    bonusNodeId: number;
  }>("/api/trees/init", payload);
  return data;
};
