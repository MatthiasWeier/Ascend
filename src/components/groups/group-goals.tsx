"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Target, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedList } from "@/components/feed-list";
import { cn } from "@/lib/utils";

type Contributor = { userId: string; userName: string; amount: number; isMe: boolean };

type GroupGoal = {
  id: string;
  title: string;
  unit: string;
  targetValue: number;
  deadline: string | null;
  total: number;
  progress: number;
  isComplete: boolean;
  contributors: Contributor[];
};

function formatAmount(n: number) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

export function GroupGoals({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const [goals, setGoals] = useState<GroupGoal[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  function refetch() {
    fetch(`/api/groups/${groupId}/goals`)
      .then((r) => r.json())
      .then((data: { goals: GroupGoal[] }) => setGoals(data.goals));
  }

  useEffect(refetch, [groupId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(targetValue);
    if (!title.trim() || !unit.trim() || !target || target <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        unit: unit.trim(),
        targetValue: target,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Fehlgeschlagen.");
      return;
    }
    toast.success("Ziel erstellt!");
    setCreateOpen(false);
    setTitle("");
    setUnit("");
    setTargetValue("");
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
    const res = await fetch(`/api/groups/${groupId}/goals/${goalId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
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
          <DialogTrigger render={<Button size="sm" className="self-end" />}>
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
                    placeholder="z.B. 10.000 Liegestütze im September"
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
                    <Label htmlFor="goal-unit">Einheit</Label>
                    <Input
                      id="goal-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Wdh, km, Min…"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="goal-deadline">Frist (optional)</Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
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
              {goal.deadline && (
                <p className="text-xs text-muted-foreground">
                  bis {new Date(goal.deadline).toLocaleDateString("de-DE")}
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
              {formatAmount(goal.total)} / {formatAmount(goal.targetValue)} {goal.unit}
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

        <form onSubmit={submitContribution} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="any"
            placeholder={`Beitrag (${goal.unit})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 flex-1"
          />
          <Button type="submit" size="sm">
            Hinzufügen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
