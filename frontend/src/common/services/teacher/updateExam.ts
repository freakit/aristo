import apiClient from "@/common/services/apiClient";
import { Exam, SectionInput } from "@/common/types";

const toUtcIso = (input?: string | null): string | null => {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const normalizeExamUpdatePayload = (p: Partial<Exam> & any): any => {
  const out: any = {};
  if (p.name !== undefined) out.name = String(p.name ?? "").trim();
  if (p.duration !== undefined) out.duration = Number(p.duration);
  if (p.chapter !== undefined)
    out.chapter =
      p.chapter == null ? null : Number(p.chapter); // ✅ 수정: 빈 문자열 비교 제거
  if (p.visibleAt !== undefined) out.visibleAt = toUtcIso(p.visibleAt);
  if (p.openAt !== undefined) out.openAt = toUtcIso(p.openAt);
  if (p.blockAt !== undefined) out.blockAt = toUtcIso(p.blockAt);

  // ✅ 수정: id 타입 명시
  if (p.vectorIds !== undefined) {
    out.vectorIds = Array.isArray(p.vectorIds)
      ? p.vectorIds.filter((id: any) => typeof id === 'number')
      : [];
  }

  if (p.sections !== undefined) {
    const first =
      Array.isArray(p.sections) && p.sections.length > 0
        ? p.sections[0]
        : null;
    out.sections = first
      ? [
          {
            title: String(first.title ?? ""),
            content: String(first.content ?? ""),
            attachmentFileIds: Array.isArray(first.attachmentFileIds)
              ? first.attachmentFileIds
              : [],
          },
        ]
      : [];
  }

  if (p.studentIds !== undefined) {
    out.studentIds = Array.isArray(p.studentIds)
      ? p.studentIds.filter(Boolean)
      : [];
  }
  return out;
};

export const updateExam = async (
  id: number | string,
  payload: Partial<Exam> & {
    sections?: SectionInput[];
    studentIds?: string[];
    vectorIds?: number[];
  }
): Promise<Exam> => {
  const body = normalizeExamUpdatePayload(payload);
  const data = await apiClient.put<Exam>(`/api/exams/${id}`, body);
  return data;
};