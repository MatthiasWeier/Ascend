"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Dumbbell, Image as ImageIcon, MessageSquare, Trophy, XCircle } from "lucide-react";
import { WorkoutSessionCard } from "@/components/workout-session-card";
import { FeedList } from "@/components/feed-list";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/time-ago";
import type { ActivityItem } from "@/lib/group-activity";
import type { MuscleFocus, SetType } from "@prisma/client";

export type OwnWorkout = {
  id: string;
  date: Date | string;
  notes: string | null;
  perceivedExertion: number | null;
  skinCondition: number | null;
  sharedGroupIds: string[];
  sets: {
    id: string;
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    setType?: SetType;
    notes?: string | null;
    exercise: { name: string; focus: MuscleFocus };
  }[];
};

type TypeFilter = "workouts" | "messages" | "photos" | "challenges";

const TYPE_LABELS: Record<TypeFilter, string> = {
  workouts: "Workouts",
  messages: "Nachrichten",
  photos: "Bilder",
  challenges: "Challenges",
};

function typeOf(item: ActivityItem): TypeFilter {
  switch (item.kind) {
    case "WORKOUT_SHARE":
      return "workouts";
    case "CHAT_TEXT":
      return "messages";
    case "CHAT_PHOTO":
      return "photos";
    default:
      return "challenges";
  }
}

const STORAGE_KEY = "ascend-home-feed-filters";
const PAGE_SIZE = 20;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function GroupItemRow({ item }: { item: ActivityItem }) {
  let Icon = Dumbbell;
  let text: React.ReactNode = "hat ein Workout gepostet";
  let iconColor = "text-primary";
  if (item.kind === "CHAT_PHOTO") {
    Icon = ImageIcon;
    text = "hat ein Foto gepostet";
  } else if (item.kind === "CHAT_TEXT") {
    Icon = MessageSquare;
    text = `hat geschrieben: "${item.content}"`;
  } else if (item.kind === "CHALLENGE_COMPLETED") {
    Icon = Check;
    iconColor = "text-success";
    text = `hat "${item.templateName}" geschafft (${item.currentReps}/${item.targetRepsSnapshot})`;
  } else if (item.kind === "CHALLENGE_ENDED_EARLY") {
    Icon = XCircle;
    iconColor = "text-destructive";
    text = `hat "${item.templateName}" abgebrochen (${item.currentReps}/${item.targetRepsSnapshot})`;
  }

  return (
    <Link
      href={`/dashboard/groups/${item.groupId}`}
      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className={item.kind === "CHAT_TEXT" ? "line-clamp-3" : "truncate"}>
          <span className="font-medium">{item.userName}</span> {text}
        </p>
        {item.kind === "CHAT_PHOTO" && item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- auth-gated proxy route, not optimizable
          <img
            src={item.imageUrl}
            alt="Gruppen-Foto"
            loading="lazy"
            className="mt-1.5 max-h-48 rounded-md border border-border object-cover"
          />
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.groupName} · {formatTimeAgo(item.timestamp)}
        </p>
      </div>
    </Link>
  );
}

export function HomeFeed({
  me,
  ownWorkouts,
  activity,
  groups,
  prSetIds,
}: {
  me: string;
  ownWorkouts: OwnWorkout[];
  activity: ActivityItem[];
  groups: { id: string; name: string }[];
  prSetIds: Set<string>;
}) {
  const [sources, setSources] = useState<string[]>([]);
  const [types, setTypes] = useState<TypeFilter[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) {
        const validSources = (saved.sources ?? []).filter(
          (s: string) => s === "me" || groups.some((g) => g.id === s)
        );
        setSources(validSources);
        setTypes((saved.types ?? []).filter((t: string) => t in TYPE_LABELS));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextSources: string[], nextTypes: TypeFilter[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sources: nextSources, types: nextTypes }));
    } catch {}
  }

  function toggleSource(id: string) {
    const next = sources.includes(id) ? sources.filter((s) => s !== id) : [...sources, id];
    setSources(next);
    setVisible(PAGE_SIZE);
    persist(next, types);
  }

  function toggleType(t: TypeFilter) {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    setTypes(next);
    setVisible(PAGE_SIZE);
    persist(sources, next);
  }

  function reset() {
    setSources([]);
    setTypes([]);
    setVisible(PAGE_SIZE);
    persist([], []);
  }

  const entries = useMemo(() => {
    const ownIds = new Set(ownWorkouts.map((w) => w.id));
    const list: (
      | { kind: "own"; ts: number; data: OwnWorkout }
      | { kind: "group"; ts: number; data: ActivityItem }
    )[] = [];

    for (const w of ownWorkouts) {
      const matchesSource =
        sources.length === 0 || sources.includes("me") || w.sharedGroupIds.some((g) => sources.includes(g));
      const matchesType = types.length === 0 || types.includes("workouts");
      if (matchesSource && matchesType) list.push({ kind: "own", ts: new Date(w.date).getTime(), data: w });
    }

    for (const item of activity) {
      // Your own shared workout already shows up as the full card above -
      // don't list it a second time as a one-line group post.
      if (item.kind === "WORKOUT_SHARE" && item.userId === me && item.workoutSessionId && ownIds.has(item.workoutSessionId)) {
        continue;
      }
      const matchesSource =
        sources.length === 0 ||
        sources.includes(item.groupId) ||
        (sources.includes("me") && item.userId === me);
      const matchesType = types.length === 0 || types.includes(typeOf(item));
      if (matchesSource && matchesType) list.push({ kind: "group", ts: new Date(item.timestamp).getTime(), data: item });
    }

    return list.sort((a, b) => b.ts - a.ts);
  }, [ownWorkouts, activity, sources, types, me]);

  const filtersActive = sources.length > 0 || types.length > 0;
  const shown = entries.slice(0, visible);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
          <Chip active={sources.includes("me")} onClick={() => toggleSource("me")}>
            Ich
          </Chip>
          {groups.map((g) => (
            <Chip key={g.id} active={sources.includes(g.id)} onClick={() => toggleSource(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
          {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((t) => (
            <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
              {TYPE_LABELS[t]}
            </Chip>
          ))}
          {filtersActive && (
            <button type="button" onClick={reset} className="shrink-0 px-1 text-xs text-muted-foreground hover:underline">
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          <Trophy className="size-4" />
          {filtersActive ? "Nichts gefunden - Filter anpassen?" : "Noch nichts los."}
        </p>
      ) : (
        <>
          <FeedList>
            {shown.map((e) =>
              e.kind === "own" ? (
                <WorkoutSessionCard
                  key={`w-${e.data.id}`}
                  sessionId={e.data.id}
                  date={e.data.date}
                  notes={e.data.notes}
                  perceivedExertion={e.data.perceivedExertion}
                  skinCondition={e.data.skinCondition}
                  sets={e.data.sets}
                  prSetIds={prSetIds}
                />
              ) : (
                <GroupItemRow key={`g-${e.data.groupId}-${e.ts}-${e.data.userId}`} item={e.data} />
              )
            )}
          </FeedList>
          {entries.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="self-center rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Mehr anzeigen
            </button>
          )}
        </>
      )}
    </div>
  );
}
