"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, History, MessageCircleWarning, Play, Plus, X, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BoldNumbers } from "@/components/bold-numbers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedList } from "@/components/feed-list";
import { cn } from "@/lib/utils";
import { ChallengeExecutionDialog } from "@/components/groups/challenge-execution-dialog";
import { useLocale } from "@/components/locale-provider";

type GoalView = {
  id: string;
  userId: string;
  userName: string;
  targetReps: number;
  isInvalidated: boolean;
  isMe: boolean;
  voteCount: number;
  votesNeeded: number;
  myVote: boolean;
  canVote: boolean;
  todayAttempt: {
    id: string;
    currentReps: number;
    workoutReps: number;
    targetRepsSnapshot: number;
    status: "IN_PROGRESS" | "COMPLETED" | "ENDED_EARLY";
    completedAt: string | null;
    difficultyRating: number | null;
  } | null;
};

type DailyChallenge = {
  id: string;
  templateName: string;
  templateDescription: string | null;
  exerciseName: string;
  stakes: string | null;
  goals: GoalView[];
};

type Template = { id: string; name: string; description: string | null; exercise: { name: string } };

export function GroupChallenges({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const { t } = useLocale();
  const [challenges, setChallenges] = useState<DailyChallenge[] | null>(null);
  const [canActivateMore, setCanActivateMore] = useState(false);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [stakesInput, setStakesInput] = useState("");
  const [executionTarget, setExecutionTarget] = useState<{
    title: string;
    attempt: NonNullable<GoalView["todayAttempt"]>;
    startedAt: string;
  } | null>(null);

  function refetch() {
    fetch(`/api/groups/${groupId}/daily-challenges`)
      .then((r) => r.json())
      .then((data: { dailyChallenges: DailyChallenge[]; canActivateMore: boolean }) => {
        setChallenges(data.dailyChallenges);
        setCanActivateMore(data.canActivateMore);
      });
  }

  useEffect(refetch, [groupId]);

  async function activate(templateId: string) {
    const res = await fetch(`/api/groups/${groupId}/daily-challenges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeTemplateId: templateId,
        stakes: stakesInput.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Failed."));
      return;
    }
    toast.success(t("Challenge activated!"));
    setActivateOpen(false);
    setStakesInput("");
    refetch();
  }

  async function deactivate(id: string) {
    const res = await fetch(`/api/groups/${groupId}/daily-challenges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("Failed."));
      return;
    }
    refetch();
  }

  async function toggleYammer(goal: GoalView) {
    const res = await fetch(`/api/challenge-goals/${goal.id}/yammer`, {
      method: goal.myVote ? "DELETE" : "POST",
    });
    if (!res.ok) {
      toast.error(t("Failed."));
      return;
    }
    refetch();
  }

  async function startAttempt(dc: DailyChallenge, goal: GoalView) {
    const res = await fetch(`/api/challenge-goals/${goal.id}/attempts`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't start."));
      return;
    }
    const data = await res.json();
    setExecutionTarget({ title: dc.templateName, attempt: data.attempt, startedAt: data.attempt.startedAt });
  }

  function openActivateDialog() {
    setActivateOpen(true);
    setStakesInput("");
    if (templates == null) {
      fetch("/api/challenge-templates")
        .then((r) => r.json())
        .then((data: { templates: Template[] }) => setTemplates(data.templates));
    }
  }

  const activeTemplateNames = new Set((challenges ?? []).map((c) => c.templateName));

  return (
    <div className="flex flex-col gap-4">
      {isLeader && (
        <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
          <DialogTrigger
            render={<Button size="sm" className="self-end" disabled={!canActivateMore} onClick={openActivateDialog} />}
          >
            <Plus className="size-4" />
            {t("Activate challenge")} {!canActivateMore && t("(max. 4)")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("Choose challenge theme")}</DialogTitle>
              <DialogDescription>{t("Everyone then sets their own rep goal.")}</DialogDescription>
            </DialogHeader>
            <Input
              value={stakesInput}
              onChange={(e) => setStakesInput(e.target.value)}
              placeholder={t("Stakes (optional), e.g. \"Loser does 20 push-ups\"")}
              maxLength={200}
            />
            {templates == null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {templates
                  .filter((tpl) => !activeTemplateNames.has(tpl.name))
                  .map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => activate(tpl.id)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{tpl.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {tpl.description ? t(tpl.description) : ""} · {tpl.exercise.name}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {challenges == null ? (
        <Skeleton className="h-32 w-full" />
      ) : challenges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("No daily challenges active yet.")} {isLeader ? t("Activate one!") : t("The leader can activate some.")}
        </p>
      ) : (
        <FeedList>
          {challenges.map((dc) => (
            <Card key={dc.id}>
              <CardContent className="flex flex-col gap-3 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{dc.templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dc.templateDescription ? t(dc.templateDescription) : ""}
                    </p>
                    {dc.stakes && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                        <Zap className="size-3" />
                        {t("Stakes: {stakes}", { stakes: dc.stakes })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <HistoryButton groupId={groupId} dailyChallengeId={dc.id} title={dc.templateName} />
                    {isLeader && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        title={t("Deactivate challenge")}
                        aria-label={t("Deactivate challenge")}
                        onClick={() => deactivate(dc.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {rankGoals(dc.goals).map(({ goal: g, rank }) => (
                    <GoalRow
                      key={g.id}
                      goal={g}
                      rank={rank}
                      onYammer={() => toggleYammer(g)}
                      onStart={() => startAttempt(dc, g)}
                    />
                  ))}
                  {!dc.goals.some((g) => g.isMe) && (
                    <SetGoalInline groupId={groupId} dailyChallengeId={dc.id} onSet={refetch} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </FeedList>
      )}

      {executionTarget && (
        <ChallengeExecutionDialog
          title={executionTarget.title}
          attempt={executionTarget.attempt}
          startedAt={executionTarget.startedAt}
          open={!!executionTarget}
          onOpenChange={(open) => !open && setExecutionTarget(null)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

const RANK_STYLE = [
  "bg-amber-400 text-amber-950", // 1st
  "bg-slate-300 text-slate-900", // 2nd
  "bg-orange-400 text-orange-950", // 3rd
];

// Today's standing: finished challenges first (earliest finisher ahead), then
// by progress towards the personal target. Nobody who hasn't started gets a rank.
function rankGoals(goals: GoalView[]): { goal: GoalView; rank: number | null }[] {
  const score = (g: GoalView) => {
    const a = g.todayAttempt;
    if (g.isInvalidated || !a) return null;
    if (a.status === "COMPLETED") return { done: 1, at: a.completedAt ? new Date(a.completedAt).getTime() : 0, pct: 1 };
    return a.currentReps > 0 ? { done: 0, at: 0, pct: a.currentReps / a.targetRepsSnapshot } : null;
  };
  const ranked = goals
    .map((goal) => ({ goal, s: score(goal) }))
    .filter((x): x is { goal: GoalView; s: NonNullable<ReturnType<typeof score>> } => x.s != null)
    .sort((a, b) => b.s.done - a.s.done || (a.s.done ? a.s.at - b.s.at : b.s.pct - a.s.pct));
  const rankedIds = new Set(ranked.map((r) => r.goal.id));
  return [
    ...ranked.map((r, i) => ({ goal: r.goal, rank: i + 1 })),
    ...goals.filter((g) => !rankedIds.has(g.id)).map((goal) => ({ goal, rank: null })),
  ];
}

function GoalRow({
  goal,
  rank,
  onYammer,
  onStart,
}: {
  goal: GoalView;
  rank: number | null;
  onYammer: () => void;
  onStart: () => void;
}) {
  const { t } = useLocale();
  const completed = goal.todayAttempt?.status === "COMPLETED";
  const needsRating =
    goal.todayAttempt &&
    goal.todayAttempt.difficultyRating == null &&
    (goal.todayAttempt.status !== "IN_PROGRESS" ||
      goal.todayAttempt.currentReps >= goal.todayAttempt.targetRepsSnapshot * 0.5);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
      <span
        title={rank ? t("Rank {n} today", { n: rank }) : t("Not started yet")}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          rank ? (RANK_STYLE[rank - 1] ?? "bg-secondary text-foreground") : "text-muted-foreground"
        )}
      >
        {rank ?? "–"}
      </span>
      <span className={cn("flex-1 font-medium", goal.isInvalidated && "text-muted-foreground line-through")}>
        {goal.userName}
        {goal.isMe && ` (${t("you")})`}
      </span>
      <span className="text-xs text-muted-foreground">
        {goal.todayAttempt ? (
          <BoldNumbers
            className="text-sm"
            text={t("{cur}/{target} reps", { cur: goal.todayAttempt.currentReps, target: goal.todayAttempt.targetRepsSnapshot })}
          />
        ) : (
          t("{n} reps", { n: goal.targetReps })
        )}
      </span>

      {completed && <Check className="size-4 text-success" />}

      {goal.isInvalidated && (
        <Badge variant="destructive" className="text-[10px]">
          {t("Challenged")}
        </Badge>
      )}

      {goal.canVote && !goal.isInvalidated && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={goal.myVote ? "default" : "outline"}
                size="icon-sm"
                onClick={onYammer}
                aria-label={t("Challenge target")}
              />
            }
          >
            <MessageCircleWarning className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            {goal.myVote
              ? t("Withdraw challenge ({votes}/{needed})", { votes: goal.voteCount, needed: goal.votesNeeded })
              : t("Target too low? Challenge it ({votes}/{needed})", { votes: goal.voteCount, needed: goal.votesNeeded })}
          </TooltipContent>
        </Tooltip>
      )}
      {goal.canVote && goal.voteCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {goal.voteCount}/{goal.votesNeeded}
        </span>
      )}

      {goal.isMe && !goal.isInvalidated && (!goal.todayAttempt || goal.todayAttempt.status === "IN_PROGRESS" || needsRating) && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                onClick={onStart}
                aria-label={needsRating ? t("Rate difficulty") : t("Start challenge")}
              />
            }
          >
            <Play className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            {needsRating
              ? t("Rate difficulty")
              : goal.todayAttempt
                ? t("Continue challenge")
                : t("Start challenge")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

type HistoryEntry = {
  dateKey: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ENDED_EARLY";
  currentReps: number;
  targetRepsSnapshot: number;
  percent: number;
};

type HistoryMember = { userId: string; userName: string; history: HistoryEntry[] };

function HistoryButton({
  groupId,
  dailyChallengeId,
  title,
}: {
  groupId: string;
  dailyChallengeId: string;
  title: string;
}) {
  const { t, dateLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<HistoryMember[] | null>(null);

  function load() {
    setOpen(true);
    fetch(`/api/groups/${groupId}/daily-challenges/${dailyChallengeId}/history`)
      .then((r) => r.json())
      .then((data: { members: HistoryMember[] }) => setMembers(data.members));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            title={t("Show history")}
            aria-label={t("Show history")}
            onClick={load}
          />
        }
      >
        <History className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("History: {title}", { title })}</DialogTitle>
          <DialogDescription>{t("Who completed, gave up or didn't even try, and when.")}</DialogDescription>
        </DialogHeader>
        {members == null ? (
          <Skeleton className="h-40 w-full" />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Nobody has set a goal for this challenge yet.")}</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
            {members.map((m) => (
              <div key={m.userId} className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">{m.userName}</p>
                {m.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("No attempts yet.")}</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {m.history.map((h) => (
                      <div
                        key={h.dateKey}
                        className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5 text-xs"
                      >
                        <span className="w-20 shrink-0 text-muted-foreground">
                          {new Date(h.dateKey).toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })}
                        </span>
                        {h.status === "COMPLETED" ? (
                          <Check className="size-3.5 shrink-0 text-success" />
                        ) : h.status === "ENDED_EARLY" ? (
                          <XCircle className="size-3.5 shrink-0 text-destructive" />
                        ) : (
                          <Play className="size-3.5 shrink-0 text-primary" />
                        )}
                        <span className="flex-1">
                          {t("{cur}/{target} reps", { cur: h.currentReps, target: h.targetRepsSnapshot })}
                        </span>
                        <span className="font-mono text-muted-foreground">{h.percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetGoalInline({
  groupId,
  dailyChallengeId,
  onSet,
}: {
  groupId: string;
  dailyChallengeId: string;
  onSet: () => void;
}) {
  const { t } = useLocale();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!n || n <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/daily-challenges/${dailyChallengeId}/goal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetReps: n }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(t("Failed."));
      return;
    }
    setValue("");
    onSet();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
    >
      <span className="flex-1 text-sm text-muted-foreground">{t("Your goal (reps)")}</span>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20"
        required
      />
      <Button type="submit" size="sm" disabled={saving}>
        {t("Set")}
      </Button>
    </form>
  );
}
