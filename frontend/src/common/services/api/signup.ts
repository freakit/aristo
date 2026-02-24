import apiClient from "@/common/services/apiClient";
import { Student } from "@/common/types";

export const signup = async (
  studentData: Partial<Omit<Student, "id">>
): Promise<{ id: string }> => {
  return await apiClient.post<{ id: string }>("/api/auth/signup", studentData);
};
