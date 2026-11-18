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
      toast.error(t("Couldn't save the setting."));
      return;
    }
    const data: Settings = await res.json();
    setSettings(data);
    toast.success(t("Saved!"));
  }

  if (settings == null) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("Rate limits")}</p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Limits login attempts, registrations, and a few other actions per user/IP - protects against brute-force and spam, at some cost to convenience."
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
          <p className="text-sm font-medium">{t("Open registration")}</p>
          <p className="text-xs text-muted-foreground">
            {t(
              "When off, only people with a valid group invite link can register - closes the instance to the public."
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
