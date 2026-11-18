"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Dumbbell, Image as ImageIcon, MessageSquare, Mountain, Trophy, XCircle } from "lucide-react";
import { FOCUS_LABEL } from "@/lib/muscle-focus";
import { ImageLightbox } from "@/components/image-lightbox";
import { BoldNumbers } from "@/components/bold-numbers";
import { ClimbingBody } from "@/components/climbing-body";
import { PostComments } from "@/components/groups/post-comments";
import { WorkoutSessionCard } from "@/components/workout-session-card";
import { FeedList } from "@/components/feed-list";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/time-ago";
import { useLocale } from "@/components/locale-provider";
import type { ActivityItem } from "@/lib/group-activity";
import type { MuscleFocus, SetType } from "@prisma/client";

export type OwnWorkout = {
  id: string;
  date: Date | string;
  notes: string | null;
  perceivedExertion: number | null;
  skinCondition: number | null;
  photos: { id: string }[];
  sharedGroupIds: string[];
  sharedPosts: { postId: string; groupId: string; groupName: string; commentCount: number }[];
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
  messages: "Messages",
  photos: "Images",
  challenges: "Challenges",
};

function typeOf(item: ActivityItem): TypeFilter {
  switch (item.kind) {
    case "WORKOUT_SHARE":
    case "CLIMBING":
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

// A workout somebody shared into a group: one summary line first, the full
// set list only on demand.
function SharedWorkoutRow({ item }: { item: Extract<ActivityItem, { workoutSessionId: string | null }> }) {
  const { t, dateLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const lines = (item.content ?? "").split("\n").slice(1).filter(Boolean);
  const exercises = new Set(lines.map((l) => l.split(":")[0].trim())).size;
  const focusText = item.focuses
    .map((f) => t("{focus} focus", { focus: t(FOCUS_LABEL[f]) }))
    .join(", ");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-l-4 border-border border-l-primary bg-primary/5 px-3 py-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-primary">
          <Dumbbell className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground">
            <span className="text-base font-semibold text-foreground">{item.userName}</span> {t("posted a workout")}
          </p>
          {exercises > 0 && (
            <p className="mt-0.5 text-sm text-foreground/80">
              <BoldNumbers
                text={[
                  exercises === 1 ? t("1 exercise") : t("{n} exercises", { n: exercises }),
                  lines.length === 1 ? t("1 set") : t("{n} sets", { n: lines.length }),
                ].join(" · ")}
              />
              {focusText && ` · ${focusText}`}
            </p>
          )}
          {item.photoIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {item.photoIds.map((id) => (
                <ImageLightbox key={id} src={`/api/workout-photos/${id}`} alt={t("Pump pic")} thumbClassName="max-h-32 max-w-40" />
              ))}
            </div>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.groupName} · {formatTimeAgo(item.timestamp, t, dateLocale)}
          </p>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <span>{open ? t("Hide details") : t("Show details")}</span>
            <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 pl-11">
          <pre className="whitespace-pre-wrap font-sans text-sm">{lines.join("\n")}</pre>
          <Link href={`/dashboard/groups/${item.groupId}`} className="w-fit text-xs font-medium text-primary hover:underline">
            {t("Open in group")}
          </Link>
        </div>
      )}
    </div>
  );
}

function GroupItemRow({ item }: { item: ActivityItem }) {
  const { t, dateLocale } = useLocale();
  if (item.kind === "WORKOUT_SHARE") return <SharedWorkoutRow item={item} />;
  let Icon = Dumbbell;
  let text: React.ReactNode = t("posted a workout");
  let iconColor = "text-primary";
  if (item.kind === "CHAT_PHOTO") {
    Icon = ImageIcon;
    text = t("posted a photo");
  } else if (item.kind === "CLIMBING") {
    Icon = Mountain;
    text = t("logged a climbing day");
  } else if (item.kind === "CHAT_TEXT") {
    Icon = MessageSquare;
    text = t("wrote: \"{text}\"", { text: item.content ?? "" });
  } else if (item.kind === "CHALLENGE_COMPLETED") {
    Icon = Check;
    iconColor = "text-success";
    text = (
      <BoldNumbers
        text={t("completed \"{name}\" ({cur}/{target})", { name: item.templateName, cur: item.currentReps, target: item.targetRepsSnapshot })}
      />
    );
  } else if (item.kind === "CHALLENGE_ENDED_EARLY") {
    Icon = XCircle;
    iconColor = "text-destructive";
    text = (
      <BoldNumbers
        className="text-destructive"
        text={t("gave up on \"{name}\" ({cur}/{target})", { name: item.templateName, cur: item.currentReps, target: item.targetRepsSnapshot })}
      />
    );
  }

  const accent =
    item.kind === "CHAT_PHOTO"
      ? "border-l-sky-500 bg-sky-500/5"
      : item.kind === "CLIMBING"
        ? "border-l-emerald-500 bg-emerald-500/5"
        : item.kind === "CHALLENGE_COMPLETED"
        ? "border-l-success bg-success/5"
        : item.kind === "CHALLENGE_ENDED_EARLY"
          ? "border-l-destructive bg-destructive/5"
          : "border-l-muted-foreground/40 bg-card";

  // Whole row links to the group (stretched link underneath); the photo sits
  // above it and opens the lightbox instead.
  return (
    <div
      className={`relative rounded-lg border border-l-4 border-border px-3 py-3 text-sm transition-colors hover:bg-accent ${accent}`}
    >
      <Link
        href={`/dashboard/groups/${item.groupId}`}
        aria-label={item.groupName}
        className="absolute inset-0 rounded-lg"
      />
      <div className="pointer-events-none relative flex items-start gap-3">
      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 ${iconColor}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-foreground/80", item.kind === "CHAT_TEXT" ? "line-clamp-3" : "truncate")}>
          <span className="font-semibold text-foreground">{item.userName}</span> {text}
        </p>
        {item.kind === "CLIMBING" && <ClimbingBody content={item.content} className="mt-1" />}
        {item.kind === "CHAT_PHOTO" && item.imageUrl && (
          <ImageLightbox className="mt-1.5" thumbClassName="max-h-64" src={item.imageUrl} alt={t("Group photo")} />
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.groupName} · {formatTimeAgo(item.timestamp, t, dateLocale)}
        </p>
      </div>
      </div>
    </div>
  );
}

export function HomeFeed({
  me,
  ownWorkouts,
  activity,
  groups,
  leaderGroupIds,
  prSetIds,
}: {
  me: string;
  ownWorkouts: OwnWorkout[];
  activity: ActivityItem[];
  groups: { id: string; name: string }[];
  leaderGroupIds: string[];
  prSetIds: Set<string>;
}) {
  const { t } = useLocale();
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
            {t("Me")}
          </Chip>
          {groups.map((g) => (
            <Chip key={g.id} active={sources.includes(g.id)} onClick={() => toggleSource(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
          {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((ty) => (
            <Chip key={ty} active={types.includes(ty)} onClick={() => toggleType(ty)}>
              {t(TYPE_LABELS[ty])}
            </Chip>
          ))}
          {filtersActive && (
            <button type="button" onClick={reset} className="shrink-0 px-1 text-xs text-muted-foreground hover:underline">
              {t("Reset")}
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          <Trophy className="size-4" />
          {filtersActive ? t("Nothing found - adjust the filters?") : t("Nothing going on yet.")}
        </p>
      ) : (
        <>
          <FeedList>
            {shown.map((e) =>
              e.kind === "own" ? (
                <div key={`w-${e.data.id}`} className="flex flex-col gap-2">
                <WorkoutSessionCard
                  sessionId={e.data.id}
                  date={e.data.date}
                  notes={e.data.notes}
                  perceivedExertion={e.data.perceivedExertion}
                  skinCondition={e.data.skinCondition}
                  sets={e.data.sets}
                  prSetIds={prSetIds}
                  photos={e.data.photos}
                  collapsible
                />
                {e.data.sharedPosts.map((sp) => (
                  <div key={sp.postId} className="px-1">
                    <PostComments
                      groupId={sp.groupId}
                      postId={sp.postId}
                      initialCount={sp.commentCount}
                      isLeader={leaderGroupIds.includes(sp.groupId)}
                      label={e.data.sharedPosts.length > 1 ? sp.groupName : undefined}
                    />
                  </div>
                ))}
                </div>
              ) : (
                <div key={`g-${e.data.groupId}-${e.ts}-${e.data.userId}`} className="flex flex-col gap-1">
                  <GroupItemRow item={e.data} />
                  {"postId" in e.data && (
                    <div className="px-1">
                      <PostComments
                        groupId={e.data.groupId}
                        postId={e.data.postId}
                        initialCount={e.data.commentCount}
                        isLeader={leaderGroupIds.includes(e.data.groupId)}
                      />
                    </div>
                  )}
                </div>
              )
            )}
          </FeedList>
          {entries.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="self-center rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              {t("Show more")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
