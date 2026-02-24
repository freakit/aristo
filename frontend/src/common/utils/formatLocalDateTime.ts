import { getLocale } from "@/common/i18n";

// 날짜/시간 포맷팅
export const toUtcDate = (v: unknown): Date | null => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const hasTz = /(Z|[+-]\d{2}:\d{2})$/.test(t);
    const withT = t.includes("T") ? t : t.replace(" ", "T");
    const iso = hasTz ? withT : `${withT}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatLocalDateTime = (v?: unknown): string => {
  if (!v) return "";
  
  const d = toUtcDate(v);
  return d
    ? d.toLocaleString(getLocale(), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
};
