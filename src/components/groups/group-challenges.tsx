"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, History, MessageCircleWarning, Play, Plus, X, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
      toast.error(data.error ?? "Fehlgeschlagen.");
      return;
    }
    toast.success("Challenge aktiviert!");
    setActivateOpen(false);
    setStakesInput("");
    refetch();
  }

  async function deactivate(id: string) {
    const res = await fetch(`/api/groups/${groupId}/daily-challenges/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Fehlgeschlagen.");
      return;
    }
    refetch();
  }

  async function toggleYammer(goal: GoalView) {
    const res = await fetch(`/api/challenge-goals/${goal.id}/yammer`, {
      method: goal.myVote ? "DELETE" : "POST",
    });
    if (!res.ok) {
      toast.error("Fehlgeschlagen.");
      return;
    }
    refetch();
  }

  async function startAttempt(dc: DailyChallenge, goal: GoalView) {
    const res = await fetch(`/api/challenge-goals/${goal.id}/attempts`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte nicht starten.");
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
            Challenge aktivieren {!canActivateMore && "(max. 4)"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Challenge-Thema wählen</DialogTitle>
              <DialogDescription>Jeder setzt danach sein eigenes Reps-Ziel.</DialogDescription>
            </DialogHeader>
            <Input
              value={stakesInput}
              onChange={(e) => setStakesInput(e.target.value)}
              placeholder="Einsatz (optional), z.B. „Verlierer macht 20 Liegestütze“"
              maxLength={200}
            />
            {templates == null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {templates
                  .filter((t) => !activeTemplateNames.has(t.name))
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => activate(t.id)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.description} · {t.exercise.name}
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
          Noch keine Daily Challenges aktiv.{isLeader ? " Aktivier eine!" : " Der Leader kann welche aktivieren."}
        </p>
      ) : (
        <FeedList>
          {challenges.map((dc) => (
            <Card key={dc.id}>
              <CardContent className="flex flex-col gap-3 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{dc.templateName}</p>
                    <p className="text-xs text-muted-foreground">{dc.templateDescription}</p>
                    {dc.stakes && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                        <Zap className="size-3" />
                        Einsatz: {dc.stakes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <HistoryButton groupId={groupId} dailyChallengeId={dc.id} title={dc.templateName} />
                    {isLeader && (
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => deactivate(dc.id)}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {dc.goals.map((g) => (
                    <GoalRow
                      key={g.id}
                      goal={g}
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

function GoalRow({ goal, onYammer, onStart }: { goal: GoalView; onYammer: () => void; onStart: () => void }) {
  const completed = goal.todayAttempt?.status === "COMPLETED";
  const needsRating =
    goal.todayAttempt &&
    goal.todayAttempt.difficultyRating == null &&
    (goal.todayAttempt.status !== "IN_PROGRESS" ||
      goal.todayAttempt.currentReps >= goal.todayAttempt.targetRepsSnapshot * 0.5);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
      <span className={cn("flex-1", goal.isInvalidated && "text-muted-foreground line-through")}>
        {goal.userName}
        {goal.isMe && " (du)"}
      </span>
      <span className="text-xs text-muted-foreground">{goal.targetReps} Wdh</span>

      {completed && <Check className="size-4 text-success" />}

      {goal.isInvalidated && (
        <Badge variant="destructive" className="text-[10px]">
          Angefochten
        </Badge>
      )}

      {goal.canVote && !goal.isInvalidated && (
        <Button
          variant={goal.myVote ? "default" : "outline"}
          size="icon-sm"
          onClick={onYammer}
          title={`Yammer (${goal.voteCount}/${goal.votesNeeded})`}
        >
          <MessageCircleWarning className="size-3.5" />
        </Button>
      )}
      {goal.canVote && goal.voteCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {goal.voteCount}/{goal.votesNeeded}
        </span>
      )}

      {goal.isMe && !goal.isInvalidated && (!goal.todayAttempt || goal.todayAttempt.status === "IN_PROGRESS" || needsRating) && (
        <Button size="icon-sm" onClick={onStart}>
          <Play className="size-3.5" />
        </Button>
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
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={load} />}>
        <History className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verlauf: {title}</DialogTitle>
          <DialogDescription>Wer hat wann geschafft, aufgegeben oder gar nicht erst versucht.</DialogDescription>
        </DialogHeader>
        {members == null ? (
          <Skeleton className="h-40 w-full" />
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch niemand hat ein Ziel für diese Challenge gesetzt.</p>
        ) : (
          <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
            {members.map((m) => (
              <div key={m.userId} className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">{m.userName}</p>
                {m.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Noch keine Versuche.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {m.history.map((h) => (
                      <div
                        key={h.dateKey}
                        className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5 text-xs"
                      >
                        <span className="w-20 shrink-0 text-muted-foreground">
                          {new Date(h.dateKey).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                        </span>
                        {h.status === "COMPLETED" ? (
                          <Check className="size-3.5 shrink-0 text-success" />
                        ) : h.status === "ENDED_EARLY" ? (
                          <XCircle className="size-3.5 shrink-0 text-destructive" />
                        ) : (
                          <Play className="size-3.5 shrink-0 text-primary" />
                        )}
                        <span className="flex-1">
                          {h.currentReps}/{h.targetRepsSnapshot} Wdh
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
      toast.error("Fehlgeschlagen.");
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
      <span className="flex-1 text-sm text-muted-foreground">Dein Ziel (Reps)</span>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20"
        required
      />
      <Button type="submit" size="sm" disabled={saving}>
        Setzen
      </Button>
    </form>
  );
}
