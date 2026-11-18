"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/locale-provider";

export function DataExport() {
  const t = useT();
  return (
    <a href="/api/settings/export" download>
      <Button type="button" variant="outline">
        <Download className="size-4" />
        {t("Export all data (JSON)")}
      </Button>
    </a>
  );
}

export function DataImport() {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/import", { method: "POST", body: form });
    setImporting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Import failed."));
      return;
    }
    const data: { sessionsImported: number; setsImported: number; newExercisesCreated: number } =
      await res.json();
    toast.success(
      data.newExercisesCreated > 0
        ? t("{sessions} workouts imported ({sets} sets, {exercises} new exercises created).", {
            sessions: data.sessionsImported,
            sets: data.setsImported,
            exercises: data.newExercisesCreated,
          })
        : t("{sessions} workouts imported ({sets} sets).", {
            sessions: data.sessionsImported,
            sets: data.setsImported,
          }),
      { duration: 6000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={importing} onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        {importing ? t("Importing…") : t("Import Strong/Hevy CSV")}
      </Button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
      <p className="text-xs text-muted-foreground">
        {t("Best effort - unknown exercises are created, muscle focus is guessed and should be reviewed afterwards.")}
      </p>
    </div>
  );
}

export function CalendarFeed() {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/settings/calendar-token")
      .then((r) => r.json())
      .then((data: { token: string }) => {
        setUrl(`${window.location.origin}/api/calendar/${data.token}.ics`);
        setLoading(false);
      });
  }

  async function regenerate() {
    setLoading(true);
    const res = await fetch("/api/settings/calendar-token", { method: "POST" });
    const data: { token: string } = await res.json();
    setUrl(`${window.location.origin}/api/calendar/${data.token}.ics`);
    setLoading(false);
    toast.success(t("New link generated - the old one no longer works."));
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => toast.success(t("Link copied.")));
  }

  if (url == null) {
    return (
      <Button type="button" variant="outline" disabled={loading} onClick={load}>
        {t("Show calendar link")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">
        {t("Add as a subscription in calendar apps (Apple/Google Calendar etc.):")}
      </Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="font-mono text-xs" />
        <Button type="button" variant="ghost" size="icon" onClick={copy} title={t("Copy")}>
          <Copy className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={regenerate} disabled={loading} title={t("Regenerate")}>
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
