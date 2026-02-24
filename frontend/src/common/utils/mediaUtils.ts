// src/utils/mediaUtils.ts

/**
 * 사용자의 User Agent를 확인하여 macOS 환경인지 판별합니다.
 * @returns {boolean} Mac일 경우 true, 아니면 false를 반환합니다.
 */
export const isMacOs = (): boolean => {
  // navigator 객체가 없는 환경(예: 서버 사이드 렌더링)을 고려하여 체크합니다.
  if (typeof window === "undefined" || !window.navigator) {
    return false;
  }
  return window.navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
};

/**
 * 사용자 에이전트 문자열을 기반으로 현재 기기가 태블릿 또는 모바일인지 확인합니다.
 * @returns {boolean} 태블릿 또는 모바일이면 true, 그렇지 않으면 false를 반환합니다.
 */
export const isTabletOrMobile = (): boolean => {
  // navigator 객체가 없는 환경(예: 서버 사이드 렌더링)을 고려하여 체크합니다.
  if (typeof window === "undefined" || !window.navigator) {
    return false;
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileRegex =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent);
};

/**
 * 사용자 에이전트 문자열을 기반으로 브라우저가 Chrome인지 확인합니다.
 * @returns {boolean} Chrome이면 true, 그렇지 않으면 false를 반환합니다.
 */
export const isChrome = (): boolean => {
  if (typeof window === "undefined" || !window.navigator) {
      return false;
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.indexOf("chrome") > -1 && userAgent.indexOf("edge") === -1 && userAgent.indexOf("opr") === -1;
};
