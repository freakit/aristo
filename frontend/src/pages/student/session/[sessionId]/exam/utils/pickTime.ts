// 시간 파싱 헬퍼
export const pickTime = (obj: any, key: string): Date | undefined => {
  if (!obj?.[key]) return undefined;
  const v = obj[key];
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "string") {
    const hasTz = /(Z|[+-]\d{2}:\d{2})$/.test(v);
    const withT = v.includes("T") ? v : v.replace(" ", "T");
    const iso = hasTz ? withT : `${withT}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};
