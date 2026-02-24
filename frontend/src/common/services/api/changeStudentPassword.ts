import apiClient, { ApiResponse } from "@/common/services/apiClient";

export const changeStudentPassword = async (data: {
  school: string;
  registrationNumber: string;
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResponse<any>> => {
  try {
    const res = await apiClient.put<any>("/api/auth/password", data);
    return { success: true, data: res };
  } catch (e: any) {
    throw new Error(e.message || "apiErrors.password_change_failed");
  }
};
