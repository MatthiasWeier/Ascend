import type { TFunction } from "@/lib/i18n";

export function formatTimeAgo(date: Date | string, t: TFunction, dateLocale: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return t("just now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("{n} min ago", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("{n} h ago", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? t("1 day ago") : t("{n} days ago", { n: days });
  return d.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" });
}
