// src/i18n/I18nProvider.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext, Language, translate } from "./index";

type Props = { children: React.ReactNode };

const STORAGE_KEY = "aristo-language"; // 다른 앱과 충돌하지 않도록 키 이름 변경

function detectBrowserLang(): Language {
  try {
    const nav =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "ko";
    return nav.toLowerCase().startsWith("en") ? "en" : "ko";
  } catch {
    return "ko";
  }
}

export const I18nProvider: React.FC<Props> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("ko");

  // 컴포넌트가 마운트될 때 localStorage나 브라우저 설정에서 언어를 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedLang =
        saved === "en" || saved === "ko" ? (saved as Language) : null;
      const initial: Language = savedLang ?? detectBrowserLang();
      setLanguage(initial);
      if (typeof document !== "undefined")
        document.documentElement.lang = initial;
    } catch {
      // noop
    }
  }, []);

  // 언어가 변경될 때마다 localStorage와 <html> 태그에 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      if (typeof document !== "undefined")
        document.documentElement.lang = language;
    } catch {
      // noop
    }
  }, [language]);

  // 언어가 바뀔 때만 t 함수를 새로 생성하여 성능 최적화
  const t = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      return translate(language, key, params);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
