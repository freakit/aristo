// common/hooks/checkLoginStatus.ts
// useAuthStatus 전용 API

import apiClient from "@/common/services/apiClient";

export interface LoginStatusResponse {
  success: boolean;
  data?: { isLoggedIn: boolean };
  error?: string;
}

export const checkLoginStatus = async (statusData: {
  school: string;
  registrationNumber: string;
  sessionId: string;
}): Promise<LoginStatusResponse> => {
  const response = await fetch(
    `${apiClient.getBaseUrl()}/api/auth/check-status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statusData),
    }
  );
  
  if (!response.ok) {
    return { success: false, error: "Status check failed" };
  }
  
  const result = await response.json();

  // If server returns raw object { isLoggedIn: boolean }
  if (result && typeof result.isLoggedIn === 'boolean') {
    return { success: true, data: result };
  }

  return result;
};
