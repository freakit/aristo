import apiClient from "@/common/services/apiClient";

export const saveTreeJSON = async (payload: {
  examStudentId: number | string;
  sectionId: number | string;
  treeJson: any;
}) => {
  return apiClient.post<any>("/api/trees/save", payload);
};
