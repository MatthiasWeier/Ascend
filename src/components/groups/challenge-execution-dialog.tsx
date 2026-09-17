"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Attempt = {
  id: string;
  currentReps: number;
  targetRepsSnapshot: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ENDED_EARLY";
  completedAt: string | null;
  difficultyRating: number | null;
};

const RATINGS = [
  { value: 1, emoji: "😁", label: "Sehr einfach" },
  { value: 2, emoji: "🙂", label: "Eher einfach" },
  { value: 3, emoji: "😐", label: "Genau richtig" },
  { value: 4, emoji: "🥵", label: "Eher schwer" },
  { value: 5, emoji: "💀", label: "Sehr schwer" },
];

const INCREMENTS = [1, 2, 5, 10];

function useElapsed(startedAt: string, running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, running]);
  return elapsed;
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChallengeExecutionDialog({
  title,
  attempt: initialAttempt,
  startedAt,
  open,
  onOpenChange,
  onChanged,
}: {
  title: string;
  attempt: Attempt;
  startedAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [busy, setBusy] = useState(false);
  const elapsed = useElapsed(startedAt, attempt.status === "IN_PROGRESS");

  useEffect(() => setAttempt(initialAttempt), [initialAttempt]);

  // Only prompt for a rating once the attempt is actually over (finished or
  // given up) - reaching 50% mid-set must NOT interrupt an active attempt.
  const needsRating = attempt.difficultyRating == null && attempt.status !== "IN_PROGRESS";
  const justFinished = attempt.status !== "IN_PROGRESS";
  const canGiveUp = attempt.currentReps >= attempt.targetRepsSnapshot * 0.5;

  async function increment(amount: number) {
    setBusy(true);
    const res = await fetch(`/api/challenge-attempts/${attempt.id}/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Konnte nicht speichern.");
      return;
    }
    const data = await res.json();
    setAttempt(data.attempt);
    if (data.attempt.status === "COMPLETED") {
      toast.success("Ziel erreicht! 🎉");
      onChanged();
    }
  }

  async function endEarly() {
    setBusy(true);
    const res = await fetch(`/api/challenge-attempts/${attempt.id}/end`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Fehlgeschlagen.");
      return;
    }
    const data = await res.json();
    setAttempt(data.attempt);
    onChanged();
  }

  async function rate(rating: number) {
    setBusy(true);
    const res = await fetch(`/api/challenge-attempts/${attempt.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Bewertung fehlgeschlagen.");
      return;
    }
    toast.success("Danke fürs Bewerten!");
    onChanged();
    onOpenChange(false);
  }

  const progressPct = Math.min(100, (attempt.currentReps / attempt.targetRepsSnapshot) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {needsRating ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-center text-sm text-muted-foreground">
              {attempt.currentReps} / {attempt.targetRepsSnapshot} Wdh &mdash; wie schwer war's?
            </p>
            <div className="flex gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  disabled={busy}
                  onClick={() => rate(r.value)}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 text-2xl transition-colors hover:bg-accent disabled:opacity-50"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="text-sm font-mono text-muted-foreground">{formatElapsed(elapsed)}</div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-bold tabular-nums">{attempt.currentReps}</span>
              <span className="text-sm text-muted-foreground">von {attempt.targetRepsSnapshot} Wdh</span>
            </div>

            <Progress value={progressPct} className="w-full" />

            {justFinished ? (
              <p className={cn("text-sm font-medium", attempt.status === "COMPLETED" ? "text-success" : "text-muted-foreground")}>
                {attempt.status === "COMPLETED" ? "Geschafft! 🎉" : "Challenge beendet."}
              </p>
            ) : (
              <>
                <div className="grid w-full grid-cols-4 gap-2">
                  {INCREMENTS.map((n) => (
                    <Button key={n} type="button" size="lg" disabled={busy} onClick={() => increment(n)}>
                      +{n}
                    </Button>
                  ))}
                </div>
                {canGiveUp && (
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={endEarly}>
                    Aufgeben
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
