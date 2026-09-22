"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { ChallengeToRate } from "@/lib/pending-challenges";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

const RATINGS = [
  { value: 1, emoji: "😁", label: "Sehr einfach" },
  { value: 2, emoji: "🙂", label: "Eher einfach" },
  { value: 3, emoji: "😐", label: "Genau richtig" },
  { value: 4, emoji: "🥵", label: "Eher schwer" },
  { value: 5, emoji: "💀", label: "Sehr schwer" },
];

// A challenge finished automatically from workout reps (challenge-workout-
// sync.ts) never opens the execution dialog that normally prompts for a
// difficulty rating - this fills that gap on the feed itself, same 5-emoji
// scale, same effect on tomorrow's target.
export function ChallengeRatingReminder({ pending: initial }: { pending: ChallengeToRate[] }) {
  const t = useT();
  const [pending, setPending] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function rate(attemptId: string, rating: number) {
    setBusyId(attemptId);
    const res = await fetch(`/api/challenge-attempts/${attemptId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setBusyId(null);
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.attemptId !== attemptId));
    }
  }

  if (pending.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      {pending.map((p) => (
        <div key={p.attemptId} className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5">
            <Trophy className="size-4 shrink-0 text-primary" />
            <span className="font-medium">
              {t("\"{name}\" geschafft ({group}) - wie schwer war's?", { name: p.templateName, group: p.groupName })}
            </span>
          </p>
          <div className="flex items-center gap-1 pl-6">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={busyId === p.attemptId}
                onClick={() => rate(p.attemptId, r.value)}
                title={t(r.label)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-accent",
                  busyId === p.attemptId && "opacity-50"
                )}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
