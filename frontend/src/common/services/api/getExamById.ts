import apiClient from "@/common/services/apiClient";
import { Exam } from "@/common/types";

// Used by: ExamDetailPage, ExamFormPage, ExamReviewPage, StudentAssistantPage
export const getExamById = async (id: string): Promise<Exam | null> => {
  try {
    const data = await apiClient.get<any>(`/api/exams/${id}`);
    if (!data) return null;
    return {
      ...data,
      chapter: data?.chapter == null ? null : Number(data.chapter),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch (error) {
    throw new Error("apiErrors.exam_info_fetch_failed");
  }
};
