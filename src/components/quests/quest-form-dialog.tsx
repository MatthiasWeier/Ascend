"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { todayGermanDateKey } from "@/lib/german-time";
import {
  MAX_STEPS_PER_QUEST,
  REMINDER_CADENCES,
  REMINDER_CADENCE_LABEL,
  reminderIntervalDays,
  type QuestDTO,
} from "@/lib/quests";
import type { QuestReminderCadence } from "@prisma/client";

// Create (no `quest`) and edit (`quest` given) share one form. Progression
// steps are only entered here when creating; afterwards they're managed on
// the card itself.
export function QuestFormDialog({
  open,
  onOpenChange,
  quest,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quest?: QuestDTO;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDateKey, setTargetDateKey] = useState("");
  const [shared, setShared] = useState(true);
  const [cadence, setCadence] = useState<QuestReminderCadence>("AUTO");
  const [stepsText, setStepsText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(quest?.title ?? "");
    setDescription(quest?.description ?? "");
    setTargetDateKey(quest?.targetDateKey ?? "");
    setShared(quest?.sharedWithGroups ?? true);
    setCadence(quest?.reminderCadence ?? "AUTO");
    setStepsText("");
  }, [open, quest]);

  const today = todayGermanDateKey();
  const interval = targetDateKey ? reminderIntervalDays(cadence, today, targetDateKey) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      title,
      description: quest ? description || null : description || undefined,
      targetDateKey,
      sharedWithGroups: shared,
      reminderCadence: cadence,
    };
    const res = await fetch(quest ? `/api/quests/${quest.id}` : "/api/quests", {
      method: quest ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quest ? payload : { ...payload, steps }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    toast.success(quest ? t("Gespeichert!") : t("Sidequest angelegt!"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{quest ? t("Sidequest bearbeiten") : t("Neue Sidequest")}</DialogTitle>
          <DialogDescription>
            {t("Ein Ziel, das du dir selbst setzt - mit Frist, Erinnerungen und (wenn du willst) eigenen Zwischenschritten.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-title">{t("Was willst du erreichen?")}</Label>
            <Input
              id="quest-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
              placeholder={t("z. B. Handstand lernen")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-desc">{t("Notiz (optional)")}</Label>
            <Textarea
              id="quest-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quest-date">{t("Bis wann?")}</Label>
            <Input
              id="quest-date"
              type="date"
              value={targetDateKey}
              min={quest ? undefined : today}
              onChange={(e) => setTargetDateKey(e.target.value)}
              required
            />
          </div>
          {!quest && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quest-steps">{t("Progression (optional)")}</Label>
              <Textarea
                id="quest-steps"
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                rows={4}
                placeholder={t("Ein Schritt pro Zeile, in der Reihenfolge, in der du sie angehen willst:\nPike Push-ups\nBeine an der Wand halten\n...")}
              />
              <p className="text-xs text-muted-foreground">
                {t("Nichts wird vorgeschlagen - die Schritte legst nur du fest. Bis zu {max} Schritte, später auf der Karte änderbar.", {
                  max: MAX_STEPS_PER_QUEST,
                })}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t("Erinnerungen")}</Label>
            <Select
              value={cadence}
              onValueChange={(v) => setCadence(v as QuestReminderCadence)}
              items={REMINDER_CADENCES.map((c) => ({ value: c, label: t(REMINDER_CADENCE_LABEL[c]) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_CADENCES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(REMINDER_CADENCE_LABEL[c])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {interval == null
                ? cadence === "NEVER"
                  ? t("Keine Erinnerungen.")
                  : t("Wähle ein Datum, dann siehst du hier, wie oft erinnert wird.")
                : t("Ca. alle {n} Tage um 9 Uhr, plus am Tag der Frist.", { n: interval })}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("Für meine Gruppen sichtbar")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Deine Gruppen sehen die Sidequest im Tab \"Sidequests\" und erfahren, wenn du sie schaffst.")}
              </p>
            </div>
            <Switch checked={shared} onCheckedChange={setShared} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim() || !targetDateKey}>
              {quest ? t("Speichern") : t("Anlegen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
