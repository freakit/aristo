import apiClient from "@/common/services/apiClient";

/**
 * ExamSet과 하위 모든 시험을 삭제합니다.
 * DELETE /api/exams/sets/:examSetId
 */
export const deleteExamSet = async (
  examSetId: number,
): Promise<{ deleted: boolean; examSetId: number }> => {
  return await apiClient.delete(`/api/exams/sets/${examSetId}`);
};
