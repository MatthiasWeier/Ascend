import { en } from "./en";

// German is the source language: the German text itself is the lookup key
// (t("Speichern")), so an untranslated string just falls back to German
// instead of showing a raw key. English lives in ./en. Scripted coverage
// check: scripts/check-i18n.mjs.
export type Locale = "de" | "en";

export const LOCALE_COOKIE = "ascend-locale";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "de";
}

export function makeT(locale: Locale): TFunction {
  return (key, vars) => {
    let text = locale === "en" ? (en[key] ?? key) : key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
    }
    return text;
  };
}

// BCP-47 tag for Intl/toLocale*String - en-GB (not en-US) so dates stay
// day-first like the German UI, and 24h time.
export function dateLocaleFor(locale: Locale): string {
  return locale === "en" ? "en-GB" : "de-DE";
}
