"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, Clock, MapPin, MessageSquarePlus, Mountain, Plus, Trash2, X } from "lucide-react";
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
import {
  MEETUP_FOCUS_LABEL,
  MEETUP_ACTIVITIES,
  MEETUP_ACTIVITY_LABEL,
  FOCUSES_BY_ACTIVITY,
  meetupDisplayName,
} from "@/lib/climbing-meetups";
import { todayGermanDateKey } from "@/lib/german-time";
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
  activity: MeetupActivity;
  title: string | null;
  dateKey: string;
  time: string | null;
  location: string | null;
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

function CreateMeetupDialog({ groupId, onCreated }: { groupId: string; onCreated: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<MeetupActivity>("CLIMBING");
  const [dateKey, setDateKey] = useState(todayGermanDateKey());
  const [title, setTitle] = useState("");
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
      toast.error(t(data.error ?? "Couldn't save."));
      return;
    }
    toast.success(t("Event planned!"));
    setTitle("");
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
        {t("Plan an event")}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Plan an event")}</DialogTitle>
          <DialogDescription>{t("The group gets notified - everything but the activity and date is optional.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("What's on?")}</Label>
            <ActivityPicker value={activity} onChange={setActivity} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mu-title">{t("Title (optional)")}</Label>
            <Input id="mu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. leg day")} maxLength={60} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mu-date">{t("Date")}</Label>
            <Input id="mu-date" type="date" min={todayGermanDateKey()} value={dateKey} onChange={(e) => setDateKey(e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mu-time">{t("Time (optional)")}</Label>
              <Input id="mu-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="mu-loc">{t("Location (optional)")}</Label>
              <Input id="mu-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("e.g. North Boulder Gym")} maxLength={120} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mu-goal">{t("What do you want to achieve? (optional)")}</Label>
            <Textarea id="mu-goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} placeholder={t("e.g. first 6a")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("What do you want to train? (optional)")}</Label>
            <FocusPicker activity={activity} value={focuses} onChange={setFocuses} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Planning…") : t("Plan an event")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuggestChangeDialog({ groupId, meetup, onSuggested }: { groupId: string; meetup: Meetup; onSuggested: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateKey && !time && !location && !note) {
      toast.error(t("Please fill in at least one field."));
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey: dateKey || undefined, time: time || undefined, location: location || undefined, note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't save."));
      return;
    }
    toast.success(t("Change suggested!"));
    setDateKey("");
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
        {t("Suggest a change")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Suggest a change")}</DialogTitle>
          <DialogDescription>
            {t("Only fill in what should change - {name} decides whether it's applied.", { name: meetup.createdBy.name })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sg-date">{t("Different date (optional)")}</Label>
              <Input id="sg-date" type="date" min={todayGermanDateKey()} value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sg-time">{t("Different time (optional)")}</Label>
              <Input id="sg-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-loc">{t("Different location (optional)")}</Label>
            <Input id="sg-loc" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder={t("e.g. North Boulder Gym")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sg-note">{t("Note (optional)")}</Label>
            <Textarea id="sg-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("e.g. the gym is closed then")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Sending…") : t("Suggest")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionRow({ groupId, meetupId, suggestion, isCreator, onChanged }: { groupId: string; meetupId: string; suggestion: Suggestion; isCreator: boolean; onChanged: () => void }) {
  const { t, dateLocale } = useLocale();
  const [busy, setBusy] = useState(false);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetupId}/suggestions/${suggestion.id}/${action}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't save."));
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
        {t("suggests:")} {parts.length > 0 ? parts.join(" · ") : t("(note only)")}
        {suggestion.status !== "PENDING" && (
          <span className={cn("ml-2 text-xs font-medium", suggestion.status === "ACCEPTED" ? "text-success" : "text-muted-foreground")}>
            {suggestion.status === "ACCEPTED" ? t("applied") : t("declined")}
          </span>
        )}
      </p>
      {suggestion.note && <p className="text-muted-foreground">{suggestion.note}</p>}
      {isCreator && suggestion.status === "PENDING" && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => respond("accept")}>
            <Check className="size-3.5" />
            {t("Apply")}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => respond("decline")}>
            <X className="size-3.5" />
            {t("Decline")}
          </Button>
        </div>
      )}
    </div>
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
    if (!res.ok) return toast.error(t("Couldn't save."));
    toast.success(t("You're in!"));
    setEditing(false);
    onChanged();
  }

  async function leave() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}/join`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error(t("Couldn't save."));
    onChanged();
  }

  async function cancelMeetup() {
    setBusy(true);
    const res = await fetch(`/api/groups/${groupId}/climbing-meetups/${meetup.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmCancel(false);
    if (!res.ok) return toast.error(t("Couldn't save."));
    toast.success(t("Event cancelled."));
    onChanged();
  }

  const pendingSuggestions = meetup.suggestions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Mountain className="size-4 text-emerald-600 dark:text-emerald-400" />
          {meetupDisplayName(meetup.activity, meetup.title)}
          <span className="font-normal text-muted-foreground">
            ·{" "}
            {new Date(`${meetup.dateKey}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
              weekday: "short",
              day: "2-digit",
              month: "short",
              timeZone: "UTC",
            })}
          </span>
        </p>
        {isCreator && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            title={t("Cancel event")}
            aria-label={t("Cancel event")}
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
            <Label className="text-xs">{t("What do you want to achieve? (optional)")}</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={200} placeholder={t("e.g. first 6a")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{t("What do you want to train? (optional)")}</Label>
            <FocusPicker activity={meetup.activity} value={focuses} onChange={setFocuses} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={join}>
              {mine ? t("Save") : t("Join")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {mine ? (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                {t("Edit details")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={leave}>
                {t("Cancel")}
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => setEditing(true)}>
              {t("I'm in")}
            </Button>
          )}
          {!isCreator && <SuggestChangeDialog groupId={groupId} meetup={meetup} onSuggested={onChanged} />}
        </div>
      )}

      {meetup.suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {pendingSuggestions > 0
              ? t("{n} open suggestions", { n: pendingSuggestions })
              : t("Suggestions")}
          </p>
          {meetup.suggestions.map((s) => (
            <SuggestionRow key={s.id} groupId={groupId} meetupId={meetup.id} suggestion={s} isCreator={isCreator} onChanged={onChanged} />
          ))}
        </div>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Cancel event?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("The event will be deleted for everyone who joined.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Back")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={cancelMeetup}>
              {t("Cancel")}
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
          {t("No event planned yet.")}
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
