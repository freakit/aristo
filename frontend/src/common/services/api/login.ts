import apiClient from "@/common/services/apiClient";
import { Student } from "@/common/types";

export interface LoginResponse {
  status: "success" | "concurrent_login_detected";
  user?: Student;
  message?: string;
  sessionId?: string;
}

export const login = async (loginData: {
  school: string;
  registrationNumber: string;
  password: string;
}): Promise<LoginResponse> => {
  return await apiClient.post<LoginResponse>("/api/auth/login", loginData);
};
