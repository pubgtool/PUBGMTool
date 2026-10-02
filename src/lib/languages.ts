import type { Language } from "@/types/domain";

export interface LanguageOption {
  /** BCP 47 code. */
  code: string;
  /** Name in its own script. */
  native: string;
  english: string;
  /** Set only for languages the app is actually translated into. */
  app?: Language;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: "en", native: "English", english: "English", app: "en" },
  { code: "ru", native: "Русский", english: "Russian", app: "ru" },
  { code: "zh", native: "中文简体", english: "Chinese (Simplified)" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "ar", native: "عربي", english: "Arabic" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "fr", native: "Français", english: "French" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "pt", native: "Português", english: "Portuguese" },
  { code: "tr", native: "Türkçe", english: "Turkish" },
  { code: "it", native: "Italiano", english: "Italian" },
  { code: "ko", native: "한국어", english: "Korean" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "uk", native: "Українська", english: "Ukrainian" },
];

const fold = (text: string): string => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Matches the native name, the English name or the code, ignoring case and accents. */
export function searchLanguages(query: string): LanguageOption[] {
  const q = fold(query.trim());
  if (!q) return [...LANGUAGES];
  return LANGUAGES.filter((l) => fold(l.native).includes(q) || fold(l.english).includes(q) || l.code === q);
}

export const languageName = (lang: Language): string => LANGUAGES.find((l) => l.app === lang)?.native ?? lang;
