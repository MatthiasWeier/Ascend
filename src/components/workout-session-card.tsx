import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FOCUS_LABEL } from "@/lib/muscle-focus";
import type { MuscleFocus } from "@prisma/client";

type SetWithExercise = {
  id: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  exercise: { name: string; focus: MuscleFocus };
};

export function WorkoutSessionCard({
  date,
  notes,
  perceivedExertion,
  skinCondition,
  sets,
  authorName,
  prSetIds,
}: {
  date: Date | string;
  notes?: string | null;
  perceivedExertion?: number | null;
  skinCondition?: number | null;
  sets: SetWithExercise[];
  authorName?: string;
  prSetIds?: Set<string>;
}) {
  const focuses = Array.from(new Set(sets.map((s) => s.exercise.focus)));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {authorName && <span className="text-sm font-medium">{authorName}</span>}
            <span className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="flex gap-1.5">
            {focuses.map((f) => (
              <Badge key={f} variant="secondary" className="text-[10px]">
                {FOCUS_LABEL[f]}
              </Badge>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-1 text-sm">
          {sets.map((set) => {
            const isPr = prSetIds?.has(set.id) ?? false;
            return (
              <li key={set.id} className="flex justify-between text-foreground/90">
                <span className="flex items-center gap-1.5">
                  {set.exercise.name}
                  {isPr && (
                    <span
                      title="Neuer persönlicher Rekord"
                      className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500"
                    >
                      <Trophy className="size-3" />
                      PR
                    </span>
                  )}
                </span>
                <span className="font-mono text-muted-foreground">
                  {set.durationSec != null
                    ? `${set.durationSec}s`
                    : `${set.reps ?? "-"} × ${set.weightKg ?? 0}kg`}
                </span>
              </li>
            );
          })}
        </ul>

        {(perceivedExertion != null || skinCondition != null) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {perceivedExertion != null && <span>Anstrengung {perceivedExertion}/10</span>}
            {skinCondition != null && <span>Haut {skinCondition}/10</span>}
          </div>
        )}

        {notes && <p className="text-sm italic text-muted-foreground">{notes}</p>}
      </CardContent>
    </Card>
  );
}
