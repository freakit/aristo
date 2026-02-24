import apiClient, {
  LoginResponse,
  ApiResponse,
} from "@/common/services/apiClient";
import { Student } from "@/common/types";

export const login = async (loginData: {
  school: string;
  registrationNumber: string;
  password: string;
}): Promise<LoginResponse> => {
  return await apiClient.post<LoginResponse>("/api/auth/login", loginData);
};

export const signup = async (
  studentData: Partial<Omit<Student, "id">>
): Promise<{ id: string }> => {
  return await apiClient.post<{ id: string }>("/api/auth/signup", studentData);
};

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
