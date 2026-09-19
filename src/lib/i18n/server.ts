import { cookies } from "next/headers";
import { LOCALE_COOKIE, dateLocaleFor, makeT, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

// For server components / route handlers: `const { t } = await getT()`.
export async function getT() {
  const locale = await getLocale();
  return { t: makeT(locale), locale, dateLocale: dateLocaleFor(locale) };
}
