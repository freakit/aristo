// pages/student/session/[sessionId]/list/getExamSets.ts
// StudentExamListPage 전용 API

import apiClient from "@/common/services/apiClient";

export const getExamSetsForStudent = async (studentId: string): Promise<any[]> => {
  console.log(studentId);
  const response = await fetch(
    `${apiClient.getBaseUrl()}/api/exams/sets/student/${studentId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  console.log(response);
  
  if (!response.ok) {
    throw new Error("Failed to fetch exam sets");
  }
  
  const result = { success: true, data: await response.json() };
  console.log(result);
  
  if (!result.success || !result.data) {
    throw new Error("Failed to fetch exam sets");
  }
  
  return result.data;
};
