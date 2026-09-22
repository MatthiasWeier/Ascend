"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";

type Settings = { rateLimitingEnabled: boolean; registrationOpen: boolean };

export function AdminInstanceSettings() {
  const { t } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busyKey, setBusyKey] = useState<keyof Settings | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Settings) => setSettings(data));
  }, []);

  async function update(key: keyof Settings, next: boolean) {
    setBusyKey(key);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    setBusyKey(null);
    if (!res.ok) {
      toast.error(t("Konnte Einstellung nicht speichern."));
      return;
    }
    const data: Settings = await res.json();
    setSettings(data);
    toast.success(t("Gespeichert!"));
  }

  if (settings == null) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("Rate Limits")}</p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Begrenzt Login-Versuche, Registrierungen und ein paar andere Aktionen pro Nutzer/IP - Schutz gegen Brute-Force und Spam, kostet aber etwas Bequemlichkeit."
            )}
          </p>
        </div>
        <Switch
          checked={settings.rateLimitingEnabled}
          disabled={busyKey === "rateLimitingEnabled"}
          onCheckedChange={(next) => update("rateLimitingEnabled", next)}
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("Offene Registrierung")}</p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Wenn aus, kann sich nur registrieren, wer einen gültigen Gruppen-Einladungslink hat - schließt die Instanz für die Öffentlichkeit."
            )}
          </p>
        </div>
        <Switch
          checked={settings.registrationOpen}
          disabled={busyKey === "registrationOpen"}
          onCheckedChange={(next) => update("registrationOpen", next)}
        />
      </div>
    </div>
  );
}
