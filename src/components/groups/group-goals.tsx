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
import { useLocale } from "@/components/locale-provider";

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

const RANK_STYLE = [
  "bg-amber-400 text-amber-950", // 1st
  "bg-slate-300 text-slate-900", // 2nd
  "bg-orange-400 text-orange-950", // 3rd
];

function formatAmount(n: number, dateLocale: string) {
  return n.toLocaleString(dateLocale, { maximumFractionDigits: 1 });
}

export function GroupGoals({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const { data: authSession } = useSession();
  const { t } = useLocale();
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
      toast.error(t("Bitte eine Einheit angeben."));
      return;
    }
    if (startDate && deadline && startDate > deadline) {
      toast.error(t("Start muss vor der Frist liegen."));
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
      toast.error(t(data.error ?? "Fehlgeschlagen."));
      return;
    }
    const data: { backfilledCount: number } = await res.json();
    toast.success(
      data.backfilledCount > 0
        ? data.backfilledCount === 1
          ? t("Ziel erstellt - 1 Beitrag aus der Vergangenheit nachgetragen!")
          : t("Ziel erstellt - {n} Beiträge aus der Vergangenheit nachgetragen!", { n: data.backfilledCount })
        : t("Ziel erstellt!")
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
      toast.error(t("Fehlgeschlagen."));
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
      toast.error(t("Fehlgeschlagen."));
      return;
    }
    toast.success(t("Beitrag hinzugefügt!"));
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      {isLeader && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" className="self-end" onClick={openCreateDialog} />}>
            <Plus className="size-4" />
            {t("Neues Ziel")}
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("Gruppenziel erstellen")}</DialogTitle>
                <DialogDescription>
                  {t("Jeder trägt Beiträge bei - der Fortschritt ist die Summe der ganzen Gruppe.")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-title">{t("Titel")}</Label>
                  <Input
                    id="goal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("z.B. 1000 Klimmzüge im September")}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-target">{t("Ziel-Wert")}</Label>
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
                    <Label>{t("Einheit")}</Label>
                    <Select
                      items={GOAL_UNITS.map((u) => ({ value: u, label: t(GOAL_UNIT_LABEL[u]) }))}
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
                            {t(GOAL_UNIT_LABEL[u])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {unit === "CUSTOM" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-custom-unit">{t("Einheit-Bezeichnung")}</Label>
                    <Input
                      id="goal-custom-unit"
                      value={customUnitLabel}
                      onChange={(e) => setCustomUnitLabel(e.target.value)}
                      placeholder={t("z.B. Bahnen, Höhenmeter…")}
                      required
                    />
                  </div>
                )}
                {(unit === "REPS" || unit === "DURATION_SEC") && (
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("Übung verknüpfen (optional)")}</Label>
                    <ExerciseCombobox
                      exercises={linkableExercises}
                      value={exerciseId}
                      onChange={setExerciseId}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("Verknüpft: Workouts und geschaffte Challenges mit dieser Übung tragen automatisch bei - kein manuelles Eintragen mehr nötig.")}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-start">{t("Start (optional)")}</Label>
                    <Input
                      id="goal-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-deadline">{t("Frist (optional)")}</Label>
                    <Input
                      id="goal-deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Ohne Start zählt die gesamte Trainings-Historie mit - bei \"1000 Klimmzüge im Oktober\" also September und früher. Zum Ausschließen Start setzen.")}
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? t("Erstellen…") : t("Ziel erstellen")}
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
          {t("Noch kein gemeinsames Ziel.")} {isLeader ? t("Leg direkt eins an!") : t("Der Leader kann eins erstellen.")}
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
  const { t, dateLocale } = useLocale();
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
                    ? `${new Date(goal.startDate).toLocaleDateString(dateLocale)} – ${new Date(goal.deadline).toLocaleDateString(dateLocale)}`
                    : goal.startDate
                      ? t("ab {date}", { date: new Date(goal.startDate).toLocaleDateString(dateLocale) })
                      : t("bis {date}", { date: new Date(goal.deadline!).toLocaleDateString(dateLocale) })}
                </p>
              )}
            </div>
          </div>
          {isLeader && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              title={t("Ziel löschen")}
              aria-label={t("Ziel löschen")}
              onClick={onDelete}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium tabular-nums">
              {formatAmount(goal.total, dateLocale)} / {formatAmount(goal.targetValue, dateLocale)} {t(goal.unitLabel)}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(goal.progress * 100)}%</span>
          </div>
          <Progress value={Math.round(goal.progress * 100)} />
        </div>

        {goal.contributors.length > 0 && (
          <ol className="flex flex-col gap-1.5">
            {[...goal.contributors]
              .sort((a, b) => b.amount - a.amount)
              .map((c, i, sorted) => (
                <li key={c.userId} className="flex items-center gap-2 text-sm">
                  <span
                    title={t("Platz {n}", { n: i + 1 })}
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      RANK_STYLE[i] ?? "bg-secondary text-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("w-24 shrink-0 truncate", c.isMe && "font-semibold text-primary")}>
                    {c.userName}
                    {c.isMe && ` (${t("du")})`}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${sorted[0].amount > 0 ? Math.max(4, (c.amount / sorted[0].amount) * 100) : 0}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-bold tabular-nums text-primary">
                    {formatAmount(c.amount, dateLocale)}
                  </span>
                </li>
              ))}
          </ol>
        )}

        {goal.exerciseId ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3 text-primary" />
            {t("Trackt automatisch: {name} (Workouts + Challenges)", { name: goal.exerciseName ?? "" })}
          </p>
        ) : (
          <form onSubmit={submitContribution} className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              placeholder={t("Beitrag ({unit})", { unit: t(goal.unitLabel) })}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 flex-1"
            />
            <Button type="submit" size="sm">
              {t("Hinzufügen")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
