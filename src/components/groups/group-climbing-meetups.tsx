"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Clock, MapPin, Mountain, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FeedList } from "@/components/feed-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";
import { CLIMBING_FOCUSES, CLIMBING_FOCUS_LABEL } from "@/lib/climbing-meetups";
import { todayGermanDateKey } from "@/lib/german-time";
import { cn } from "@/lib/utils";
import type { ClimbingFocus } from "@prisma/client";

type Participant = {
  userId: string;
  goal: string | null;
  focuses: ClimbingFocus[];
  user: { id: string; name: string; avatarUrl: string | null };
};

type Meetup = {
  id: string;
  dateKey: string;
  time: string | null;
  location: string | null;
  createdBy: { id: string; name: string };
  participants: Participant[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function FocusPicker({ value, onChange }: { value: ClimbingFocus[]; onChange: (v: ClimbingFocus[]) => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-1.5">
      {CLIMBING_FOCUSES.map((f) => {
        const active = value.includes(f);
        return (
          <button
            key={f}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((x) => x !== f) : [...value, f])}
            className={cn(
              "min-h-8 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
            )}
          >
            {t(CLIMBING_FOCUS_LABEL[f])}
          </button>
        );
      })}
    </div>
  );
}

function CreateMeetupDialog({ groupId, onCreated }: { groupId: string; onCreated: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState(todayGermanDateKey());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [focuses, setFocuses] = useState<ClimbingFocus[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey, time: time || undefined, location: location || undefined, goal: goal || undefined, focuses }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    toast.success(t("Klettertag geplant!"));
    setTime("");
    setLocation("");
    setGoal("");
    setFocuses([]);
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <Plus className="size-4" />
        {t("Klettertag planen")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Klettertag planen")}</DialogTitle>
          <DialogDescription>{t("Die Gruppe wird benachrichtigt - alles außer dem Datum ist optional.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mu-date">{t("Datum")}</Label>
            <Input id="mu-date" type="date" min={todayGermanDateKey()} value={dateKey} onChange={(e) => setDateKey(e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mu-time">{t("Uhrzeit (optional)")}</Label>
              <Input id="mu-time" value={time} onChange={(e) => setTime(e.target.value)} placeholder={t("z.B. 18:00")} maxLength={20} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mu-loc">{t("Ort (optional)")}</Label>
              <Input id="mu-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("z.B. Boulderhalle Nord")} maxLength={120} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mu-goal">{t("Was möchtest du schaffen? (optional)")}</Label>
            <Textarea id="mu-goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} placeholder={t("z.B. erste 6a")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Woran möchtest du trainieren? (optional)")}</Label>
            <FocusPicker value={focuses} onChange={setFocuses} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Planen…") : t("Klettertag planen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetupItem({ groupId, meetup, myId, onChanged }: { groupId: string; meetup: Meetup; myId: string; onChanged: () => void }) {
  const { t, dateLocale } = useLocale();
  const mine = meetup.participants.find((p) => p.userId === myId);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(mine?.goal ?? "");
  const [focuses, setFocuses] = useState<ClimbingFocus[]>(mine?.focuses ?? []);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isCreator = meetup.createdBy.id === myId;

  async function join() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: goal || undefined, focuses }),
    });
    setBusy(false);
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    toast.success(t("Zugesagt!"));
    setEditing(false);
    onChanged();
  }

  async function leave() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}/join`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    onChanged();
  }

  async function cancelMeetup() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmCancel(false);
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    toast.success(t("Klettertag abgesagt."));
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Mountain className="size-4 text-emerald-600 dark:text-emerald-400" />
          {new Date(`${meetup.dateKey}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            timeZone: "UTC",
          })}
        </p>
        {isCreator && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            title={t("Klettertag absagen")}
            aria-label={t("Klettertag absagen")}
            onClick={() => setConfirmCancel(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {(meetup.time || meetup.location) && (
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {meetup.time && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {meetup.time}
            </span>
          )}
          {meetup.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {meetup.location}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {meetup.participants.map((p) => (
          <span
            key={p.userId}
            title={p.goal ?? undefined}
            className="flex items-center gap-1.5 rounded-full bg-secondary/50 py-1 pr-2.5 pl-1 text-xs"
          >
            <Avatar className="size-5">
              {p.user.avatarUrl && <AvatarImage src={p.user.avatarUrl} alt={p.user.name} />}
              <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                {initials(p.user.name)}
              </AvatarFallback>
            </Avatar>
            {p.user.name}
          </span>
        ))}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t("Was möchtest du schaffen? (optional)")}</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} placeholder={t("z.B. erste 6a")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t("Woran möchtest du trainieren? (optional)")}</Label>
            <FocusPicker value={focuses} onChange={setFocuses} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={join}>
              {mine ? t("Speichern") : t("Zusagen")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("Abbrechen")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {mine ? (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                {t("Details bearbeiten")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={leave}>
                {t("Absagen")}
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => setEditing(true)}>
              {t("Ich komme mit")}
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Klettertag absagen?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Der Klettertag wird für alle gelöscht, die zugesagt haben.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Zurück")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={cancelMeetup}>
              {t("Absagen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function GroupClimbingMeetups({ groupId }: { groupId: string }) {
  const { t } = useLocale();
  const { data: authSession } = useSession();
  const myId = authSession?.user?.id ?? null;
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);

  function refetch() {
    fetch(`/api/groups/${groupId}/climbing-meetups`)
      .then((r) => r.json())
      .then((data: { meetups: Meetup[] }) => setMeetups(data.meetups));
  }
  useEffect(refetch, [groupId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateMeetupDialog groupId={groupId} onCreated={refetch} />
      </div>
      {meetups == null || myId == null ? (
        <Skeleton className="h-32 w-full" />
      ) : meetups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("Noch kein Klettertag geplant.")}
        </p>
      ) : (
        <FeedList>
          {meetups.map((m) => (
            <MeetupItem key={m.id} groupId={groupId} meetup={m} myId={myId} onChanged={refetch} />
          ))}
        </FeedList>
      )}
    </div>
  );
}
