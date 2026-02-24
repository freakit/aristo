// 시험 상태 타입
export type ExamStatus = "hidden" | "visible" | "open" | "blocked";

// 서버 status 우선, 없으면 UTC 오픈/차단으로 계산
export const getExamStatus = (e: any): ExamStatus => {
  const s = e?.status as ExamStatus | undefined;
  if (s) return s;

  const toUtcIso = (s?: string | null): string | undefined => {
    if (!s) return undefined;
    const t = s.trim();
    return /(Z|[+-]\d{2}:\d{2})$/.test(t)
      ? t
      : (t.includes("T") ? t : t.replace(" ", "T")) + "Z";
  };

  const parseUtc = (s?: string | null) => {
    const iso = toUtcIso(s);
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  const now = new Date();
  const v = parseUtc(e?.visibleAt);
  const o = parseUtc(e?.openAt);
  const b = parseUtc(e?.blockAt);

  if (!o || !b) return "hidden";
  if (v && now < v) return "hidden";
  if (now < o) return "visible";
  if (now < b) return "open";
  return "blocked";
};

export const statusText: Record<ExamStatus, string> = {
  hidden: "비공개",
  visible: "공개(대기)",
  open: "응시 가능",
  blocked: "차단",
};
