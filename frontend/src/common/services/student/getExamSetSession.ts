import apiClient from "@/common/services/apiClient";

// Used by: ExamReviewPage, ExamSetShellPage
export const getExamSetSession = async (
  examSetId: string,
  studentId: string
): Promise<any> => {
  const data = await apiClient.get<any>(
    `/api/exams/sets/${examSetId}/session?studentId=${studentId}`
  );
  return data;
};
