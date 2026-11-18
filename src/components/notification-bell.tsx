"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, Dumbbell, Flag, HandHeart, MessageCircle, Mountain, Reply, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";
import { formatTimeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import type { TFunction } from "@/lib/i18n";

type Item = {
  id: string;
  type:
    | "COMMENT"
    | "REPLY"
    | "NUDGE"
    | "WORKOUT_POST"
    | "CHALLENGE_DONE"
    | "CLIMBING"
    | "CLIMBING_INVITE"
    | "WORKOUT_REMINDER"
    | "MEETUP_REMINDER"
    | "QUEST_REMINDER"
    | "QUEST_DONE";
  actorName: string;
  groupName: string;
  snippet: string | null;
  url: string;
  createdAt: string;
  readAt: string | null;
};

const POLL_MS = 60_000;

function describe(n: Item, t: TFunction) {
  switch (n.type) {
    case "COMMENT":
      return { icon: MessageCircle, text: t("{name} commented on your post", { name: n.actorName }) };
    case "REPLY":
      return { icon: Reply, text: t("{name} replied to your comment", { name: n.actorName }) };
    case "NUDGE":
      return { icon: HandHeart, text: t("{name} nudged you - get your workout done!", { name: n.actorName }) };
    case "WORKOUT_POST":
      return { icon: Dumbbell, text: t("{name} posted a workout", { name: n.actorName }) };
    case "CLIMBING":
      return { icon: Mountain, text: t("{name} went climbing ({n} sends)", { name: n.actorName, n: n.snippet ?? "" }) };
    case "CLIMBING_INVITE": {
      const [activityName, date] = (n.snippet ?? "|").split("|");
      return {
        icon: Mountain,
        text: t("{name} is planning \"{activity}\" on {date} - who's in?", { name: n.actorName, activity: activityName, date }),
      };
    }
    case "CHALLENGE_DONE":
      return {
        icon: Trophy,
        text: t("{name} completed \"{challenge}\"", { name: n.actorName, challenge: n.snippet ?? "" }),
      };
    case "WORKOUT_REMINDER":
      return {
        icon: BellRing,
        text: n.snippet ? t("Training time: {label}", { label: n.snippet }) : t("Your scheduled training time is here."),
      };
    case "QUEST_REMINDER": {
      // "daysLeft|done|total|title" - title last since it may contain "|".
      const [daysLeft, done, total, ...titleParts] = (n.snippet ?? "").split("|");
      const title = titleParts.join("|");
      const days = Number(daysLeft);
      const when =
        days <= 0
          ? t("Deadline is today")
          : days === 1
            ? t("1 day left")
            : t("{days} days left", { days });
      const steps = Number(total) > 0 ? ` · ${t("{done}/{total} steps", { done, total })}` : "";
      return { icon: Flag, text: `${t("Sidequest \"{title}\"", { title })}: ${when}${steps}` };
    }
    case "QUEST_DONE":
      return {
        icon: Flag,
        text: t("{name} completed the sidequest \"{title}\"", { name: n.actorName, title: n.snippet ?? "" }),
      };
    case "MEETUP_REMINDER": {
      const [activityName] = (n.snippet ?? "").split("|");
      return { icon: BellRing, text: t("Reminder: \"{activity}\" is coming up", { activity: activityName }) };
    }
  }
}

// The reliable notification channel: lives in the app itself, so it works
// even where web push can't (blocked push service, unsupported browser).
export function NotificationBell() {
  const { t, dateLocale } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[] | null>(null);

  const pollCount = useCallback(() => {
    fetch("/api/notifications?count=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { unreadCount: number } | null) => data && setUnread(data.unreadCount))
      .catch(() => {});
  }, []);

  const loadList = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data: { notifications: Item[]; unreadCount: number }) => {
        setItems(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    pollCount();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") pollCount();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && pollCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollCount]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadList();
  }

  async function markRead(ids?: string[]) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
    const now = new Date().toISOString();
    setItems((prev) =>
      (prev ?? []).map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n))
    );
    pollCount();
  }

  function openItem(n: Item) {
    if (!n.readAt) markRead([n.id]);
    setOpen(false);
    router.push(n.url);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label={unread > 0 ? t("{n} unread notifications", { n: unread }) : t("Notifications")}
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">{t("Notifications")}</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3.5" />
              {t("Mark all read")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items == null ? (
            <div className="p-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("No notifications yet.")}</p>
          ) : (
            items.map((n) => {
              const { icon: Icon, text } = describe(n, t);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent",
                    !n.readAt && "bg-primary/5"
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block", !n.readAt && "font-medium")}>{text}</span>
                    {n.snippet &&
                      !["CHALLENGE_DONE", "CLIMBING", "CLIMBING_INVITE", "WORKOUT_REMINDER", "MEETUP_REMINDER", "QUEST_REMINDER", "QUEST_DONE"].includes(n.type) && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">“{n.snippet}”</span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {n.groupName} · {formatTimeAgo(n.createdAt, t, dateLocale)}
                    </span>
                  </span>
                  {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
