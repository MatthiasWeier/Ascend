"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";

type Reminder = { id: string; weekday: number; time: string; label: string | null; enabled: boolean };
type LeadTime = "NEVER" | "ONE_HOUR_BEFORE" | "MORNING_OF" | "EVENING_BEFORE";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const LEAD_TIMES: { value: LeadTime; label: string }[] = [
  { value: "NEVER", label: "Nie" },
  { value: "ONE_HOUR_BEFORE", label: "1 Stunde vorher" },
  { value: "MORNING_OF", label: "Am selben Tag morgens" },
  { value: "EVENING_BEFORE", label: "Am Vortag abends" },
];

function weekdayLabel(t: (s: string) => string, w: number) {
  return t(WEEKDAYS[w]);
}

// Two independent reminder settings: a personal weekly training schedule
// (not tied to any group - "Montag 13 Uhr, Mittwoch 18 Uhr") and how long
// before a planned group meetup you're in to get a heads-up. Both are
// fired by the in-process scheduler (lib/scheduler.ts).
export function WorkoutReminders() {
  const { t } = useLocale();
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [leadTime, setLeadTime] = useState<LeadTime | null>(null);
  const [weekday, setWeekday] = useState("0");
  const [time, setTime] = useState("18:00");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  function loadReminders() {
    fetch("/api/workout-reminders")
      .then((r) => r.json())
      .then((data: { reminders: Reminder[] }) => setReminders(data.reminders));
  }
  useEffect(() => {
    loadReminders();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: { user: { meetupReminderLeadTime: LeadTime } }) => setLeadTime(data.user.meetupReminderLeadTime));
  }, []);

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/workout-reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekday: Number(weekday), time, label: label || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    setLabel("");
    toast.success(t("Erinnerung hinzugefügt."));
    loadReminders();
  }

  async function toggle(id: string, enabled: boolean) {
    setReminders((prev) => prev?.map((r) => (r.id === id ? { ...r, enabled } : r)) ?? prev);
    const res = await fetch(`/api/workout-reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      toast.error(t("Konnte nicht speichern."));
      loadReminders();
    }
  }

  async function remove(id: string) {
    setReminders((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    const res = await fetch(`/api/workout-reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("Konnte nicht speichern."));
      loadReminders();
    }
  }

  async function saveLeadTime(v: LeadTime) {
    const previous = leadTime;
    setLeadTime(v);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetupReminderLeadTime: v }),
    });
    if (!res.ok) {
      setLeadTime(previous);
      toast.error(t("Konnte nicht speichern."));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("Eigene Trainingszeiten")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Wöchentlich wiederkehrend, unabhängig von Gruppen - z.B. \"Montag 13 Uhr, Mittwoch 18 Uhr\".")}
        </p>
        {reminders == null ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            {reminders.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                    <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, v)} />
                    <span className={r.enabled ? "" : "text-muted-foreground line-through"}>
                      {weekdayLabel(t, r.weekday)} {r.time}
                      {r.label && ` - ${r.label}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      title={t("Löschen")}
                      aria-label={t("Löschen")}
                      onClick={() => remove(r.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addReminder} className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{t("Wochentag")}</Label>
                <Select value={weekday} onValueChange={(v) => setWeekday(v as string)} items={WEEKDAYS.map((_, i) => ({ value: String(i), label: weekdayLabel(t, i) }))}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {weekdayLabel(t, i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wr-time" className="text-xs">
                  {t("Uhrzeit")}
                </Label>
                <Input id="wr-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" required />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="wr-label" className="text-xs">
                  {t("Label (optional)")}
                </Label>
                <Input id="wr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("z.B. Gym")} maxLength={60} />
              </div>
              <Button type="submit" size="sm" disabled={saving}>
                <Plus className="size-4" />
                {t("Hinzufügen")}
              </Button>
            </form>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">{t("Gemeinsame Termine")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Wie lange vorher du an einen Klettertag/Gym-Termin erinnert werden willst, dem du zugesagt hast.")}
        </p>
        {leadTime == null ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <Select value={leadTime} onValueChange={(v) => saveLeadTime(v as LeadTime)} items={LEAD_TIMES.map((l) => ({ value: l.value, label: t(l.label) }))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_TIMES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {t(l.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
