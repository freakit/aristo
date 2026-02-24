// 'YYYY-MM-DDTHH:mm' (로컬) -> UTC ISO(Z)
export const localToUtcIso = (local: string): string => {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
};
