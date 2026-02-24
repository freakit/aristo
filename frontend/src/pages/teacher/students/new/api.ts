import apiClient, { ApiResponse } from "@/common/services/apiClient";
import { Student } from "@/common/types";

export const checkStudentExists = async (
  registrationNumber: string
): Promise<boolean> => {
  const data = await apiClient.get<{ exists: boolean }>(
    `/api/students/exists/${registrationNumber}`
  );
  return data.exists;
};

export const addStudentsBulk = async (
  students: Partial<Omit<Student, "id">>[]
): Promise<
  ApiResponse<{ successCount: number; failedCount: number; errors: any[] }>
> => {
  try {
    const data = await apiClient.post<{
      successCount: number;
      failedCount: number;
      errors: any[];
    }>("/api/students/bulk", { students });
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
