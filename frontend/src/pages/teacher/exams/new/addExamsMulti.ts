// pages/teacher/exams/new/addExamsMulti.ts
// ExamFormPage (new) 전용 API - Refactored to use apiClient for proper auth

import apiClient from "@/common/services/apiClient";
import { ExamSetCreatePayload } from "@/common/types";

export const addExamsMulti = async (
  payload: ExamSetCreatePayload
): Promise<{ examSetId: number; examIds: number[] }> => {
  // Use apiClient's addExamsMulti method which handles normalization and auth
  return await apiClient.addExamsMulti(payload);
};
