// src/i18n/index.ts

import { createContext, useContext } from "react";
import en from "./translations/en.json";
import ko from "./translations/ko.json";

export type Language = "ko" | "en";
export type TranslateParams = Record<string, unknown>;

export const translations: Record<Language, any> = { en, ko };

export const getNestedTranslation = (
  obj: any,
  path: string
): string | undefined => {
  if (!obj || !path) return undefined;
  let cur: any = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object" || !(key in cur))
      return undefined;
    cur = cur[key];
  }
  return typeof cur === "string" ? cur : undefined;
};

export const formatTemplate = (
  template: string,
  params?: TranslateParams
): string => {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
    const v = (params as any)[k];
    return v == null ? "" : String(v);
  });
};

export const getCurrentLanguage = (): Language => {
  if (typeof document === "undefined") return "ko";
  const lang = (document.documentElement.lang || "").toLowerCase();
  return lang.startsWith("en") ? "en" : "ko";
};

export const translate = (
  lang: Language,
  key: string,
  params?: TranslateParams
): string => {
  const raw = getNestedTranslation(translations[lang], key);
  if (raw) return formatTemplate(raw, params);
  // 만약 번역을 찾지 못하면, 개발 중 쉽게 알아볼 수 있도록 키 경로를 그대로 반환합니다.
  return key;
};

export const tt = (
  key: string,
  params?: TranslateParams,
  langOverride?: Language
): string => {
  const lang = langOverride || getCurrentLanguage();
  return translate(lang, key, params);
};

export const getLocale = (lang?: Language): string => {
  const language = lang || getCurrentLanguage();
  return language === "en" ? "en-US" : "ko-KR";
};

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: TranslateParams) => string;
}

export const I18nContext = createContext<I18nContextType | undefined>(
  undefined
);

export const useTranslation = (): I18nContextType => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
};
