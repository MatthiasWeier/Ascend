"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

// Compact DE/EN switch for places without room for a full settings row
// (login, register, landing page, app header).
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const next = locale === "en" ? "de" : "en";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      aria-label={locale === "en" ? "Auf Deutsch wechseln" : "Switch to English"}
      title={locale === "en" ? "Deutsch" : "English"}
      onClick={() => setLocale(next)}
    >
      <Languages className="size-4" />
      {locale === "en" ? "EN" : "DE"}
    </Button>
  );
}
