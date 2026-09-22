"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, Clock, MapPin, MessageSquarePlus, Mountain, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
  MEETUP_FOCUS_LABEL,
  MEETUP_ACTIVITIES,
  MEETUP_ACTIVITY_LABEL,
  FOCUSES_BY_ACTIVITY,
  meetupDisplayName,
} from "@/lib/climbing-meetups";
import { cn } from "@/lib/utils";
import type { ClimbingFocus, MeetupActivity, SuggestionStatus } from "@prisma/client";

type Participant = {
  userId: string;
  goal: string | null;
  focuses: ClimbingFocus[];
  user: { id: string; name: string; avatarUrl: string | null };
};

type Suggestion = {
  id: string;
  dateKey: string | null;
  time: string | null;
  location: string | null;
  note: string | null;
  status: SuggestionStatus;
  suggestedBy: { id: string; name: string };
};

type Meetup = {
  id: string;
  groupId: string;
  activity: MeetupActivity;
  title: string | null;
  time: string | null;
  location: string | null;
  group: { id: string; name: string };
  createdBy: { id: string; name: string };
  participants: Participant[];
  suggestions: Suggestion[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function FocusPicker({ activity, value, onChange }: { activity: MeetupActivity; value: ClimbingFocus[]; onChange: (v: ClimbingFocus[]) => void }) {
  const { t } = useLocale();
  const options = FOCUSES_BY_ACTIVITY[activity];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((f) => {
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
            {t(MEETUP_FOCUS_LABEL[f])}
          </button>
        );
      })}
    </div>
  );
}

function ActivityPicker({ value, onChange }: { value: MeetupActivity; onChange: (v: MeetupActivity) => void }) {
  const { t } = useLocale();
  return (
    <div className="flex gap-1.5" role="group">
      {MEETUP_ACTIVITIES.map((a) => (
        <button
          key={a}
          type="button"
          aria-pressed={value === a}
          onClick={() => onChange(a)}
          className={cn(
            "min-h-9 flex-1 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors",
            value === a
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
          )}
        >
          {t(MEETUP_ACTIVITY_LABEL[a])}
        </button>
      ))}
    </div>
  );
}

function SuggestChangeDialog({ meetup, onSuggested }: { meetup: Meetup; onSuggested: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time && !location && !note) {
      toast.error(t("Bitte mindestens ein Feld ausfüllen."));
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/groups/${meetup.groupId}/climbing-meetups/${meetup.id}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time: time || undefined, location: location || undefined, note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    toast.success(t("Änderung vorgeschlagen!"));
    setTime("");
    setLocation("");
    setNote("");
    setOpen(false);
    onSuggested();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <MessageSquarePlus className="size-3.5" />
        {t("Änderung vorschlagen")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Änderung vorschlagen")}</DialogTitle>
          <DialogDescription>
            {t("Nur ausfüllen, was sich ändern soll - {name} entscheidet, ob's übernommen wird.", { name: meetup.createdBy.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-time">{t("Andere Uhrzeit (optional)")}</Label>
            <Input id="sg-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-loc">{t("Anderer Ort (optional)")}</Label>
            <Input id="sg-loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder={t("z.B. Boulderhalle Nord")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-note">{t("Notiz (optional)")}</Label>
            <Textarea id="sg-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("z.B. Halle hat da zu")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Senden…") : t("Vorschlagen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionRow({ meetup, suggestion, isCreator, onChanged }: { meetup: Meetup; suggestion: Suggestion; isCreator: boolean; onChanged: () => void }) {
  const { t, dateLocale } = useLocale();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/groups/${meetup.groupId}/climbing-meetups/${meetup.id}/suggestions/${suggestion.id}/${action}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    onChanged();
  }

  const parts: string[] = [];
  if (suggestion.dateKey) parts.push(new Date(`${suggestion.dateKey}T00:00:00.000Z`).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", timeZone: "UTC" }));
  if (suggestion.time) parts.push(suggestion.time);
  if (suggestion.location) parts.push(suggestion.location);

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border px-3 py-2 text-sm", suggestion.status === "PENDING" ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-secondary/30")}>
      <p>
        <span className="font-medium">{suggestion.suggestedBy.name}</span>{" "}
        {t("schlägt vor:")} {parts.length > 0 ? parts.join(" · ") : t("(nur Notiz)")}
        {suggestion.status !== "PENDING" && (
          <span className={cn("ml-2 text-xs font-medium", suggestion.status === "ACCEPTED" ? "text-success" : "text-muted-foreground")}>
            {suggestion.status === "ACCEPTED" ? t("übernommen") : t("abgelehnt")}
          </span>
        )}
      </p>
      {suggestion.note && <p className="text-muted-foreground">{suggestion.note}</p>}
      {isCreator && suggestion.status === "PENDING" && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => respond("accept")}>
            <Check className="size-3.5" />
            {t("Übernehmen")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => respond("decline")}>
            <X className="size-3.5" />
            {t("Ablehnen")}
          </Button>
        </div>
      )}
    </div>
  );
}

function MeetupCard({ meetup, myId, onChanged }: { meetup: Meetup; myId: string; onChanged: () => void }) {
  const { t } = useLocale();
  const mine = meetup.participants.find((p) => p.userId === myId);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(mine?.goal ?? "");
  const [focuses, setFocuses] = useState<ClimbingFocus[]>(mine?.focuses ?? []);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isCreator = meetup.createdBy.id === myId;

  async function join() {
    setBusy(true);
    const res = await fetch(`/api/groups/${meetup.groupId}/climbing-meetups/${meetup.id}/join`, {
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
    const res = await fetch(`/api/groups/${meetup.groupId}/climbing-meetups/${meetup.id}/join`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    onChanged();
  }

  async function cancelMeetup() {
    setBusy(true);
    const res = await fetch(`/api/groups/${meetup.groupId}/climbing-meetups/${meetup.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmCancel(false);
    if (!res.ok) return toast.error(t("Konnte nicht speichern."));
    toast.success(t("Termin abgesagt."));
    onChanged();
  }

  const pendingSuggestions = meetup.suggestions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Mountain className="size-4 text-emerald-600 dark:text-emerald-400" />
            {meetupDisplayName(meetup.activity, meetup.title)}
          </p>
          <p className="text-xs text-muted-foreground">{meetup.group.name} · {t("Geplant von {name}", { name: meetup.createdBy.name })}</p>
        </div>
        {isCreator && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            title={t("Termin absagen")}
            aria-label={t("Termin absagen")}
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

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {meetup.participants.length === 1
            ? t("1 Person kommt")
            : t("{n} Personen kommen", { n: meetup.participants.length })}
        </p>
        {meetup.participants.map((p) => (
          <div key={p.userId} className="flex items-start gap-2 rounded-lg bg-secondary/40 px-2.5 py-2 text-sm">
            <Avatar className="size-7 shrink-0">
              {p.user.avatarUrl && <AvatarImage src={p.user.avatarUrl} alt={p.user.name} />}
              <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                {initials(p.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {p.user.name}
                {p.userId === myId && ` (${t("du")})`}
              </p>
              {p.goal && <p className="text-xs text-muted-foreground">{p.goal}</p>}
              {p.focuses.length > 0 && (
                <p className="mt-0.5 flex flex-wrap gap-1">
                  {p.focuses.map((f) => (
                    <span key={f} className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {t(MEETUP_FOCUS_LABEL[f])}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
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
            <FocusPicker activity={meetup.activity} value={focuses} onChange={setFocuses} />
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
        <div className="flex flex-wrap gap-2">
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
          {!isCreator && <SuggestChangeDialog meetup={meetup} onSuggested={onChanged} />}
        </div>
      )}

      {meetup.suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {pendingSuggestions > 0 ? t("{n} offene Vorschläge", { n: pendingSuggestions }) : t("Vorschläge")}
          </p>
          {meetup.suggestions.map((s) => (
            <SuggestionRow key={s.id} meetup={meetup} suggestion={s} isCreator={isCreator} onChanged={onChanged} />
          ))}
        </div>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Termin absagen?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Der Termin wird für alle gelöscht, die zugesagt haben.")}
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

function CreateMeetupForm({ dateKey, onCreated }: { dateKey: string; onCreated: () => void }) {
  const { t } = useLocale();
  const [groups, setGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [groupId, setGroupId] = useState("");
  const [activity, setActivity] = useState<MeetupActivity>("CLIMBING");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [focuses, setFocuses] = useState<ClimbingFocus[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { groups: { id: string; name: string }[] }) => {
        setGroups(data.groups);
        if (data.groups.length > 0) setGroupId(data.groups[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activity,
        title: title || undefined,
        dateKey,
        time: time || undefined,
        location: location || undefined,
        goal: goal || undefined,
        focuses,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht speichern."));
      return;
    }
    toast.success(t("Termin geplant!"));
    onCreated();
  }

  if (groups == null) return <Skeleton className="h-40 w-full" />;
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Du bist in keiner Gruppe - trit einer bei, um Termine zu planen.")}</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {groups.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label>{t("Gruppe")}</Label>
          <Select value={groupId} onValueChange={(v) => setGroupId(v as string)} items={groups.map((g) => ({ value: g.id, label: g.name }))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label>{t("Was steht an?")}</Label>
        <ActivityPicker value={activity} onChange={setActivity} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mu-title">{t("Titel (optional)")}</Label>
        <Input id="mu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("z.B. Beintag")} maxLength={60} />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="mu-time">{t("Uhrzeit (optional)")}</Label>
          <Input id="mu-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
        <FocusPicker activity={activity} value={focuses} onChange={setFocuses} />
      </div>
      <Button type="submit" disabled={saving || !groupId} className="self-start">
        {saving ? t("Planen…") : t("Termin planen")}
      </Button>
    </form>
  );
}

// Personal, cross-group view of one future calendar day: shows every
// planned meetup (any activity) across the user's groups, lets them RSVP
// with an optional goal/focus, propose a change, or plan a new one.
export function ClimbingMeetupDayDialog({
  dateKey,
  open,
  onOpenChange,
  onChanged,
}: {
  dateKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { t, dateLocale } = useLocale();
  const { data: authSession } = useSession();
  const myId = authSession?.user?.id ?? null;
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);

  function load() {
    fetch(`/api/climbing-meetups/${dateKey}`)
      .then((r) => r.json())
      .then((data: { meetups: Meetup[] }) => setMeetups(data.meetups));
  }

  useEffect(() => {
    setMeetups(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
              weekday: "long",
              day: "2-digit",
              month: "long",
              timeZone: "UTC",
            })}
          </DialogTitle>
          <DialogDescription>{t("Geplante Termine deiner Gruppen an diesem Tag.")}</DialogDescription>
        </DialogHeader>

        {meetups == null || myId == null ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {meetups.map((m) => (
              <MeetupCard
                key={m.id}
                meetup={m}
                myId={myId}
                onChanged={() => {
                  load();
                  onChanged();
                }}
              />
            ))}
            <div className="flex flex-col gap-1.5">
              {meetups.length > 0 && <p className="text-xs font-medium text-muted-foreground">{t("Weiteren Termin planen")}</p>}
              <CreateMeetupForm
                dateKey={dateKey}
                onCreated={() => {
                  load();
                  onChanged();
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
