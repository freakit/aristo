// common/contexts/professorApi.ts
// AuthContext 전용 Professor API

import apiClient from "@/common/services/apiClient";

export interface ProfessorLoginResult {
  status: "success";
  user: any;
  sessionId: string;
}

export const professorLogin = async (payload: {
  email: string;
  password: string;
}): Promise<ProfessorLoginResult> => {
  const response = await fetch(
    `${apiClient.getBaseUrl()}/api/auth/professor/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("로그인 실패");
  }

  const result = await response.json();

  if (result.status !== "success") {
    throw new Error(result.error || "로그인 실패");
  }

  return result;
};

export const professorLogout = async (email: string): Promise<void> => {
  await fetch(`${apiClient.getBaseUrl()}/api/auth/professor/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

export const checkProfessorStatus = async (
  email: string,
  sessionId: string
): Promise<{ isLoggedIn: boolean }> => {
  const response = await fetch(
    `${apiClient.getBaseUrl()}/api/auth/professor/check-status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, sessionId }),
    }
  );

  if (!response.ok) {
    return { isLoggedIn: false };
  }

  const result = await response.json();

  // checkProfessorStatus controller returns plain json with isLoggedIn
  // authService.checkProfessorLoginStatus returns { isLoggedIn: boolean }
  // auth.controller sends res.status(200).json(status)
  // So result IS the status object.
  
  return result;
};
