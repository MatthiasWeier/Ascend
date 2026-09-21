"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { BODY_PARTS, BODY_PART_LABEL, SEVERITIES, SEVERITY_LABEL } from "@/lib/injuries";
import { cn } from "@/lib/utils";
import type { BodyPart, InjurySeverity } from "@prisma/client";

type Injury = {
  id: string;
  bodyPart: BodyPart;
  severity: InjurySeverity;
  note: string | null;
  endsAt: string | null;
};

const SEVERITY_STYLE: Record<InjurySeverity, string> = {
  MILD: "bg-amber-500/15 text-amber-500",
  MODERATE: "bg-orange-500/15 text-orange-500",
  SEVERE: "bg-destructive/15 text-destructive",
};

// Settings card: what hurts right now. Affected exercises are warned about
// while logging and (moderate/severe) dropped from the Workout Brain.
export function InjuriesCard() {
  const { t, dateLocale } = useLocale();
  const [injuries, setInjuries] = useState<Injury[] | null>(null);
  const [bodyPart, setBodyPart] = useState<BodyPart>("FOREARM");
  const [severity, setSeverity] = useState<InjurySeverity>("MODERATE");
  const [note, setNote] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/injuries")
      .then((r) => r.json())
      .then((data: { injuries: Injury[] }) => setInjuries(data.injuries))
      .catch(() => setInjuries([]));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/injuries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyPart, severity, note: note || undefined, endsAt: endsAt || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    toast.success(t("Verletzung gespeichert."));
    setNote("");
    setEndsAt("");
    load();
  }

  async function heal(id: string) {
    const res = await fetch(`/api/injuries/${id}`, { method: "PATCH" });
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    toast.success(t("Als ausgeheilt markiert."));
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/injuries/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {injuries == null ? (
        <Skeleton className="h-16 w-full" />
      ) : injuries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Keine aktiven Verletzungen. Gut so!")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {injuries.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {t(BODY_PART_LABEL[i.bodyPart])}
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", SEVERITY_STYLE[i.severity])}>
                    {t(SEVERITY_LABEL[i.severity])}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {i.note && `${i.note} · `}
                  {i.endsAt
                    ? t("bis {date}", { date: new Date(i.endsAt).toLocaleDateString(dateLocale) })
                    : t("bis du sie als ausgeheilt markierst")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => heal(i.id)}
                title={t("Als ausgeheilt markieren")}
              >
                <CheckCheck className="size-4" />
                {t("Ausgeheilt")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(i.id)}
                title={t("Eintrag löschen")}
                aria-label={t("Eintrag löschen")}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
        <p className="text-sm font-medium">{t("Verletzung hinzufügen")}</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <Label>{t("Wo tut es weh?")}</Label>
            <Select
              value={bodyPart}
              onValueChange={(v) => setBodyPart(v as BodyPart)}
              items={BODY_PARTS.map((p) => ({ value: p, label: t(BODY_PART_LABEL[p]) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BODY_PARTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(BODY_PART_LABEL[p])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <Label>{t("Wie schlimm?")}</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as InjurySeverity)}
              items={SEVERITIES.map((s) => ({ value: s, label: t(SEVERITY_LABEL[s]) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(SEVERITY_LABEL[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {severity === "MILD"
            ? t("Leicht: Beim Eintragen siehst du nur eine Warnung.")
            : t("Mittel/Schwer: Betroffene Übungen werden zusätzlich nicht mehr vom Workout Brain vorgeschlagen.")}
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <Label htmlFor="inj-note">{t("Notiz (optional)")}</Label>
            <Input id="inj-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("z.B. Sehnenreizung links")} />
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <Label htmlFor="inj-end">{t("Voraussichtlich ausgeheilt (optional)")}</Label>
            <Input id="inj-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={saving} className="self-start">
          <Plus className="size-4" />
          {t("Hinzufügen")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("Hinweis: Ascend ersetzt keine ärztliche Beratung. Bei anhaltenden Schmerzen bitte abklären lassen.")}
        </p>
      </form>
    </div>
  );
}
