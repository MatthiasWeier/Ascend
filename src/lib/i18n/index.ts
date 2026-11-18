import { de } from "./de";

// English is the source language: the English text itself is the lookup
// key (t("Save")), so an untranslated string just falls back to English
// instead of showing a raw key. German lives in ./de. Scripted coverage
// check: scripts/check-i18n.mjs.
export type Locale = "en" | "de";

export const LOCALE_COOKIE = "ascend-locale";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "de" ? "de" : "en";
}

export function makeT(locale: Locale): TFunction {
  return (key, vars) => {
    let text = locale === "de" ? (de[key] ?? key) : key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
    }
    return text;
  };
}

// BCP-47 tag for Intl/toLocale*String - en-GB (not en-US) so dates stay
// day-first, and 24h time, matching this app's established formatting
// regardless of language.
export function dateLocaleFor(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-GB";
}
