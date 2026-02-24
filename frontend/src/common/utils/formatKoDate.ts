/**
 * 날짜 객체 또는 문자열을 받아 "YYYY년 MM월 DD일" 형식으로 반환합니다.
 * 교사 대시보드 및 시험 목록에서 사용됩니다.
 */
export const formatKoDate = (v?: string | Date | null): string => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  return `${y}년 ${m}월 ${day}일`;
};
