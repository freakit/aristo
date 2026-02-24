import { getExamAttachments } from "@/common/services/api/getExamAttachments";

// 시험 첨부파일 Map 가져오기
export const fetchExamAttachmentMap = async (examId: string) => {
  const files = await getExamAttachments(examId);
  const map = new Map<number, any>();
  for (const f of files as any[]) map.set(Number(f.id), f);
  return map;
};
