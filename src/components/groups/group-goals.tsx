"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Pencil, Plus, Target, Trophy, X, Zap } from "lucide-react";
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
import { ExerciseMultiCombobox } from "@/components/exercise-multi-combobox";
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
  exerciseIds: string[];
  exerciseNames: string[];
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

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

type FormState = {
  title: string;
  unit: GoalUnitValue;
  customUnitLabel: string;
  exerciseIds: string[];
  targetValue: string;
  startDate: string;
  deadline: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  unit: "REPS",
  customUnitLabel: "",
  exerciseIds: [],
  targetValue: "",
  startDate: "",
  deadline: "",
};

export function GroupGoals({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const { data: authSession } = useSession();
  const { t } = useLocale();
  const [goals, setGoals] = useState<GroupGoal[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GroupGoal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function refetch() {
    fetch(`/api/groups/${groupId}/goals`)
      .then((r) => r.json())
      .then((data: { goals: GroupGoal[] }) => setGoals(data.goals));
  }

  useEffect(refetch, [groupId]);

  function loadExercises() {
    if (exercises.length === 0) {
      fetch("/api/exercises")
        .then((r) => r.json())
        .then((data: { exercises: Exercise[] }) => setExercises(data.exercises));
    }
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(EMPTY_FORM);
    loadExercises();
    setDialogOpen(true);
  }

  function openEditDialog(goal: GroupGoal) {
    setEditing(goal);
    setForm({
      title: goal.title,
      unit: goal.unit,
      customUnitLabel: goal.unit === "CUSTOM" ? goal.unitLabel : "",
      exerciseIds: goal.exerciseIds,
      targetValue: String(goal.targetValue),
      startDate: toDateInput(goal.startDate),
      deadline: toDateInput(goal.deadline),
    });
    loadExercises();
    setDialogOpen(true);
  }

  // Only exercises whose type matches the chosen unit can be linked -
  // REPS goals track rep-based exercises, DURATION_SEC goals track timed
  // holds. KM/CUSTOM goals can't be auto-tracked at all (nothing in the
  // app measures distance yet), so no linking UI shows for those.
  const linkableExercises = useMemo(() => {
    const wantType = form.unit === "DURATION_SEC" ? "HOLD" : "REPS";
    return exercises.filter((e) => e.type === wantType);
  }, [exercises, form.unit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(form.targetValue);
    if (!form.title.trim() || !target || target <= 0) return;
    if (form.unit === "CUSTOM" && !form.customUnitLabel.trim()) {
      toast.error(t("Please specify a unit."));
      return;
    }
    if (form.startDate && form.deadline && form.startDate > form.deadline) {
      toast.error(t("Start must be before the deadline."));
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      unit: form.unit,
      customUnitLabel: form.unit === "CUSTOM" ? form.customUnitLabel.trim() : undefined,
      targetValue: target,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : editing ? null : undefined,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : editing ? null : undefined,
      exerciseIds: form.exerciseIds,
    };
    const res = await fetch(
      editing ? `/api/groups/${groupId}/goals/${editing.id}` : `/api/groups/${groupId}/goals`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Failed."));
      return;
    }
    if (editing) {
      toast.success(t("Saved!"));
    } else {
      const data: { backfilledCount: number } = await res.json();
      toast.success(
        data.backfilledCount > 0
          ? data.backfilledCount === 1
            ? t("Goal created - 1 past contribution added!")
            : t("Goal created - {n} past contributions added!", { n: data.backfilledCount })
          : t("Goal created!")
      );
    }
    setDialogOpen(false);
    refetch();
  }

  async function handleDelete(goalId: string) {
    const res = await fetch(`/api/groups/${groupId}/goals/${goalId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("Failed."));
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
      toast.error(t("Failed."));
      return;
    }
    toast.success(t("Contribution added!"));
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      {isLeader && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" className="self-end" onClick={openCreateDialog} />}>
            <Plus className="size-4" />
            {t("New goal")}
          </DialogTrigger>
          <DialogContent className="max-h-[92dvh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editing ? t("Edit group goal") : t("Create group goal")}</DialogTitle>
                <DialogDescription>
                  {t("Everyone contributes - progress is the sum of the whole group.")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-title">{t("Title")}</Label>
                  <Input
                    id="goal-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t("e.g. 3000 push-ups in September")}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-target">{t("Target value")}</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      min={1}
                      step="any"
                      value={form.targetValue}
                      onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label>{t("Unit")}</Label>
                    <Select
                      items={GOAL_UNITS.map((u) => ({ value: u, label: t(GOAL_UNIT_LABEL[u]) }))}
                      value={form.unit}
                      onValueChange={(v) => setForm((f) => ({ ...f, unit: v as GoalUnitValue, exerciseIds: [] }))}
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
                {form.unit === "CUSTOM" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="goal-custom-unit">{t("Unit label")}</Label>
                    <Input
                      id="goal-custom-unit"
                      value={form.customUnitLabel}
                      onChange={(e) => setForm((f) => ({ ...f, customUnitLabel: e.target.value }))}
                      placeholder={t("e.g. laps, meters of elevation…")}
                      required
                    />
                  </div>
                )}
                {(form.unit === "REPS" || form.unit === "DURATION_SEC") && (
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("Link exercises (optional)")}</Label>
                    <ExerciseMultiCombobox
                      exercises={linkableExercises}
                      value={form.exerciseIds}
                      onChange={(ids) => setForm((f) => ({ ...f, exerciseIds: ids }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("When linked: workouts and completed challenges with any of these exercises contribute automatically - e.g. push-ups + diamond + pike together.")}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-start">{t("Start (optional)")}</Label>
                    <Input
                      id="goal-start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="goal-deadline">{t("Deadline (optional)")}</Label>
                    <Input
                      id="goal-deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Without a start date your entire training history counts - for \"1000 pull-ups in October\" that includes September and earlier. Set a start date to exclude it.")}
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? t("Saving…") : editing ? t("Save") : t("Create goal")}
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
          {t("No shared goal yet.")} {isLeader ? t("Create one right away!") : t("The leader can create one.")}
        </p>
      ) : (
        <FeedList>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isLeader={isLeader}
              onEdit={() => openEditDialog(goal)}
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
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: GroupGoal;
  isLeader: boolean;
  onEdit: () => void;
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
                      ? t("from {date}", { date: new Date(goal.startDate).toLocaleDateString(dateLocale) })
                      : t("until {date}", { date: new Date(goal.deadline!).toLocaleDateString(dateLocale) })}
                </p>
              )}
            </div>
          </div>
          {isLeader && (
            <div className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                title={t("Edit goal")}
                aria-label={t("Edit goal")}
                onClick={onEdit}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                title={t("Delete goal")}
                aria-label={t("Delete goal")}
                onClick={onDelete}
              >
                <X className="size-4" />
              </Button>
            </div>
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
                    title={t("Rank {n}", { n: i + 1 })}
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      RANK_STYLE[i] ?? "bg-secondary text-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("w-24 shrink-0 truncate", c.isMe && "font-semibold text-primary")}>
                    {c.userName}
                    {c.isMe && ` (${t("you")})`}
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

        {goal.exerciseIds.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3 text-primary" />
            {t("Tracked automatically: {names} (workouts + challenges)", { names: goal.exerciseNames.join(", ") })}
          </p>
        ) : (
          <form onSubmit={submitContribution} className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              placeholder={t("Contribution ({unit})", { unit: t(goal.unitLabel) })}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 flex-1"
            />
            <Button type="submit" size="sm">
              {t("Add")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
