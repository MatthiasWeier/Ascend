"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FOCUS_LABEL } from "@/lib/muscle-focus";
import { cn } from "@/lib/utils";
import { useWeightUnit } from "@/components/weight-unit-context";
import type { MuscleFocus, SetType } from "@prisma/client";

type SetWithExercise = {
  id: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  setType?: SetType;
  notes?: string | null;
  exercise: { name: string; focus: MuscleFocus };
};

const SET_TYPE_BADGE: Partial<Record<SetType, { label: string; className: string }>> = {
  WARMUP: { label: "W", className: "bg-amber-500/15 text-amber-600" },
  DROP: { label: "D", className: "bg-blue-500/15 text-blue-600" },
  FAILURE: { label: "F", className: "bg-destructive/15 text-destructive" },
};

const SET_TYPE_LABEL_FULL: Record<SetType, string> = {
  WARMUP: "Warm-up",
  NORMAL: "Normal",
  DROP: "Dropsatz",
  FAILURE: "Failure",
};

export function WorkoutSessionCard({
  sessionId,
  date,
  notes,
  perceivedExertion,
  skinCondition,
  sets,
  authorName,
  prSetIds,
  onDeleted,
}: {
  sessionId?: string;
  date: Date | string;
  notes?: string | null;
  perceivedExertion?: number | null;
  skinCondition?: number | null;
  sets: SetWithExercise[];
  authorName?: string;
  prSetIds?: Set<string>;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { format, unitLabel } = useWeightUnit();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const focuses = Array.from(new Set(sets.map((s) => s.exercise.focus)));

  async function handleDelete() {
    if (!sessionId) return;
    setDeleting(true);
    const res = await fetch(`/api/workouts/${sessionId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Konnte Workout nicht löschen.");
      return;
    }
    toast.success("Workout gelöscht.");
    setConfirmOpen(false);
    onDeleted?.();
    router.refresh();
  }

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
          <div className="flex items-center gap-1.5">
            {focuses.map((f) => (
              <Badge key={f} variant="secondary" className="text-[10px]">
                {FOCUS_LABEL[f]}
              </Badge>
            ))}
            {sessionId && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground" />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={`/dashboard/workouts/new?edit=${sessionId}`} />}>
                    <Pencil className="size-4" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                    <Trash2 className="size-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <ul className="flex flex-col gap-1 text-sm">
          {sets.map((set) => {
            const isPr = prSetIds?.has(set.id) ?? false;
            const typeBadge = set.setType ? SET_TYPE_BADGE[set.setType] : undefined;
            return (
              <li key={set.id} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-foreground/90">
                  <span className="flex items-center gap-1.5">
                    {typeBadge && (
                      <span
                        title={SET_TYPE_LABEL_FULL[set.setType!]}
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
                          typeBadge.className
                        )}
                      >
                        {typeBadge.label}
                      </span>
                    )}
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
                      ? set.weightKg
                        ? `${set.durationSec}s @ ${format(set.weightKg)}${unitLabel}`
                        : `${set.durationSec}s`
                      : `${set.reps ?? "-"} × ${format(set.weightKg ?? 0)}${unitLabel}`}
                  </span>
                </div>
                {set.notes && <p className="text-xs italic text-muted-foreground">{set.notes}</p>}
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

      {sessionId && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Workout löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Das kann nicht rückgängig gemacht werden. Bereits geteilte Gruppen-Posts bleiben
                erhalten, verlieren aber den Bezug zu diesem Workout.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction disabled={deleting} onClick={handleDelete}>
                {deleting ? "Löschen…" : "Löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
