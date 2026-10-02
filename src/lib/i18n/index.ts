"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { Language } from "@/types/domain";
import * as announcement from "./announcement";
import * as auth from "./auth";
import * as core from "./core";
import * as home from "./home";
import * as invite from "./invite";
import * as language from "./language";
import * as security from "./security";

/** One typed catalogue assembled from per-area modules. Keys are namespaced by area, so modules never collide. */
const EN = { ...core.en, ...auth.en, ...home.en, ...announcement.en, ...invite.en, ...language.en, ...security.en };

export type MessageKey = keyof typeof EN;

const RU: Record<MessageKey, string> = { ...core.ru, ...auth.ru, ...home.ru, ...announcement.ru, ...invite.ru, ...language.ru, ...security.ru };

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en: EN, ru: RU };

export type MessageVars = Record<string, string | number>;

export function translate(lang: Language, key: MessageKey, vars?: MessageVars): string {
  const text = DICTIONARIES[lang][key];
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
}

function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const formatPoints = (lang: Language, n: number): string =>
  lang === "ru" ? ruPlural(n, "балл", "балла", "баллов") : n === 1 ? "Point" : "Points";

export function useT(): { t: (key: MessageKey, vars?: MessageVars) => string; lang: Language } {
  const lang = useAppStore((s) => s.activeLanguage);
  const t = useCallback((key: MessageKey, vars?: MessageVars) => translate(lang, key, vars), [lang]);
  return { t, lang };
}
