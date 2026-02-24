// pages/student/session/[sessionId]/list/logout.ts
// StudentExamListPage 전용 API

import apiClient from "@/common/services/apiClient";

export interface LogoutResponse {
  success: boolean;
  data?: { message: string };
  error?: string;
}

export const logout = async (logoutData: {
  school: string;
  registrationNumber: string;
}): Promise<LogoutResponse> => {
  const response = await fetch(
    `${apiClient.getBaseUrl()}/api/auth/logout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logoutData),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: "Logout failed" };
  }
  
  const data = await response.json();
  return { success: true, data };
};
