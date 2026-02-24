// 서버에서 온 문자열이 타임존 미표기면 UTC로 간주해 Z를 부여
export const ensureUtcIso = (s?: string | null): string => {
  if (!s) return "";
  const t = s.trim();
  if (!t) return "";
  const hasTz = /(Z|[+-]\d{2}:\d{2})$/.test(t);
  const withT = t.includes("T") ? t : t.replace(" ", "T");
  return hasTz ? withT : `${withT}Z`;
};

export const toIso = (v?: string | null): string => {
  const iso = ensureUtcIso(v ?? "");
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error("Invalid datetime");
  return d.toISOString();
};
