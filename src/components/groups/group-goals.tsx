"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Target, Trophy, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { FeedList } from "@/components/feed-list";
import { cn } from "@/lib/utils";
import { GOAL_UNITS, GOAL_UNIT_LABEL, type GoalUnitValue } from "@/lib/goal-units";

type Contributor = { userId: string; userName: string; amount: number; isMe: boolean };

type GroupGoal = {
  id: string;
  title: string;
  unit: GoalUnitValue;
  unitLabel: string;
  targetValue: number;
  startDate: string | null;
  deadline: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  total: number;
  progress: number;
  isComplete: boolean;
  contributors: Contributor[];
};

type Exercise = { id: string; name: string; type: "REPS" | "HOLD" };

function formatAmount(n: number) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

export function GroupGoals({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const { data: authSession } = useSession();
  const [goals, setGoals] = useState<GroupGoal[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState<GoalUnitValue>("REPS");
  const [customUnitLabel, setCustomUnitLabel] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  function refetch() {
    fetch(`/api/groups/${groupId}/goals`)
      .then((r) => r.json())
      .then((data: { goals: GroupGoal[] }) => setGoals(data.goals));
  }

  useEffect(refetch, [groupId]);

  function openCreateDialog() {
    setCreateOpen(true);
    if (exercises.length === 0) {
      fetch("/api/exercises")
        .then((r) => r.json())
        .then((data: { exercises: Exercise[] }) => setExercises(data.exercises));
    }
  }

  // Only exercises whose type matches the chosen unit can be linked -
  // REPS goals track rep-based exercises, DURATION_SEC goals track timed
  // holds. KM/CUSTOM goals can't be auto-tracked at all (nothing in the
  // app measures distance yet), so no linking UI shows for those.
  const linkableExercises = useMemo(() => {
    const wantType = unit === "DURATION_SEC" ? "HOLD" : "REPS";
    return exercises.filter((e) => e.type === wantType);
  }, [exercises, unit]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(targetValue);
    if (!title.trim() || !target || target <= 0) return;
    if (unit === "CUSTOM" && !customUnitLabel.trim()) {
      toast.error("Bitte eine Einheit angeben.");
      return;
    }
    if (startDate && deadline && startDate > deadline) {
      toast.error("Start muss vor der Frist liegen.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        unit,
        customUnitLabel: unit === "CUSTOM" ? customUnitLabel.trim() : undefined,
        targetValue: target,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        exerciseId: exerciseId || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Fehlgeschlagen.");
      return;
    }
    const data: { backfilledCount: number } = await res.json();
    toast.success(
      data.backfilledCount > 0
        ? `Ziel erstellt - ${data.backfilledCount} Beitrag${data.backfilledCount === 1 ? "" : "e"} aus der Vergangenheit nachgetragen!`
        : "Ziel erstellt!"
    );
    setCreateOpen(false);
    setTitle("");
    setUnit("REPS");
    setCustomUnitLabel("");
    setExerciseId("");
    setTargetValue("");
    setStartDate("");
    setDeadline("");
    refetch();
  }

  async function handleDelete(goalId: string) {
    const res = await fetch(`/api/groups/${groupId}/goals/${goalId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Fehlgeschlagen.");
      return;
    }
    refetch();
  }

  async function handleContribute(goalId: string, amount: number) {
    const previousGoals = goals;
    setGoals(
      (goals ?? []).map((g) => {
        if (g.id !== goalId) return g;
        const total = g.total + amount;
        const contributors = [...g.contributors];
        const mine = contributors.findIndex((c) => c.isMe);
        if (mine >= 0) {
          contributors[mine] = { ...contributors[mine], amount: contributors[mine].amount + amount };
        } else {
          contributors.push({
            userId: authSession?.user?.id ?? "me",
            userName: authSession?.user?.name ?? "",
            amount,
            isMe: true,
          });
        }
        return {
          ...g,
          total,
          progress: Math.min(total / g.targetValue, 1),
          isComplete: total >= g.targetValue,
          contributors,
        };
      })
    );

    const res = await fetch(`/api/groups/${groupId}/goals/${goalId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      setGoals(previousGoals);
      toast.error("Fehlgeschlagen.");
      return;
    }
    toast.success("Beitrag hinzugefügt!");
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      {isLeader && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" className="self-end" onClick={openCreateDialog} />}>
            <Plus className="size-4" />
            Neues Ziel
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Gruppenziel erstellen</DialogTitle>
                <DialogDescription>
                  Jeder trägt Beiträge bei - der Fortschritt ist die Summe der ganzen Gruppe.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-title">Titel</Label>
                  <Input
                    id="goal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. 1000 Klimmzüge im September"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-target">Ziel-Wert</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      min={1}
                      step="any"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label>Einheit</Label>
                    <Select
                      value={unit}
                      onValueChange={(v) => {
                        setUnit(v as GoalUnitValue);
                        setExerciseId("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {GOAL_UNIT_LABEL[u]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {unit === "CUSTOM" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-custom-unit">Einheit-Bezeichnung</Label>
                    <Input
                      id="goal-custom-unit"
                      value={customUnitLabel}
                      onChange={(e) => setCustomUnitLabel(e.target.value)}
                      placeholder="z.B. Bahnen, Höhenmeter…"
                      required
                    />
                  </div>
                )}
                {(unit === "REPS" || unit === "DURATION_SEC") && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Übung verknüpfen (optional)</Label>
                    <ExerciseCombobox
                      exercises={linkableExercises}
                      value={exerciseId}
                      onChange={setExerciseId}
                    />
                    <p className="text-xs text-muted-foreground">
                      Verknüpft: Workouts und geschaffte Challenges mit dieser Übung tragen
                      automatisch bei - kein manuelles Eintragen mehr nötig.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-start">Start (optional)</Label>
                    <Input
                      id="goal-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-deadline">Frist (optional)</Label>
                    <Input
                      id="goal-deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ohne Start zählt die gesamte Trainings-Historie mit - bei "1000 Klimmzüge im
                  Oktober" also September und früher. Zum Ausschließen Start setzen.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Erstellen…" : "Ziel erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {goals == null ? (
        <Skeleton className="h-32 w-full" />
      ) : goals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch kein gemeinsames Ziel. {isLeader ? "Leg direkt eins an!" : "Der Leader kann eins erstellen."}
        </p>
      ) : (
        <FeedList>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isLeader={isLeader}
              onDelete={() => handleDelete(goal.id)}
              onContribute={(amount) => handleContribute(goal.id, amount)}
            />
          ))}
        </FeedList>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  isLeader,
  onDelete,
  onContribute,
}: {
  goal: GroupGoal;
  isLeader: boolean;
  onDelete: () => void;
  onContribute: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");

  function submitContribution(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return;
    onContribute(n);
    setAmount("");
  }

  return (
    <Card className={cn(goal.isComplete && "border-success/40")}>
      <CardContent className="flex flex-col gap-3 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {goal.isComplete ? (
              <Trophy className="size-4 text-amber-500" />
            ) : (
              <Target className="size-4 text-primary" />
            )}
            <div>
              <p className="font-medium">{goal.title}</p>
              {(goal.startDate || goal.deadline) && (
                <p className="text-xs text-muted-foreground">
                  {goal.startDate && goal.deadline
                    ? `${new Date(goal.startDate).toLocaleDateString("de-DE")} – ${new Date(goal.deadline).toLocaleDateString("de-DE")}`
                    : goal.startDate
                      ? `ab ${new Date(goal.startDate).toLocaleDateString("de-DE")}`
                      : `bis ${new Date(goal.deadline!).toLocaleDateString("de-DE")}`}
                </p>
              )}
            </div>
          </div>
          {isLeader && (
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium tabular-nums">
              {formatAmount(goal.total)} / {formatAmount(goal.targetValue)} {goal.unitLabel}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(goal.progress * 100)}%</span>
          </div>
          <Progress value={Math.round(goal.progress * 100)} />
        </div>

        {goal.contributors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {goal.contributors.map((c) => (
              <span
                key={c.userId}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  c.isMe ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
                )}
              >
                {c.userName}
                {c.isMe && " (du)"}: {formatAmount(c.amount)}
              </span>
            ))}
          </div>
        )}

        {goal.exerciseId ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3 text-primary" />
            Trackt automatisch: {goal.exerciseName} (Workouts + Challenges)
          </p>
        ) : (
          <form onSubmit={submitContribution} className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              placeholder={`Beitrag (${goal.unitLabel})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 flex-1"
            />
            <Button type="submit" size="sm">
              Hinzufügen
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
