"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Pencil, Trash2, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BoldNumbers } from "@/components/bold-numbers";
import { useWeightUnit } from "@/components/weight-unit-context";
import { useLocale } from "@/components/locale-provider";
import { ImageLightbox } from "@/components/image-lightbox";
import { formatDurationSec } from "@/lib/duration-format";
import { distanceUnitLabel, formatDistance } from "@/lib/distance-units";
import type { MuscleFocus, SetType } from "@prisma/client";

type SetWithExercise = {
  id: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceMeters: number | null;
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
  DROP: "Drop set",
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
  collapsible = false,
  photos,
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
  collapsible?: boolean;
  photos?: { id: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { format, unitLabel, unit: weightUnit } = useWeightUnit();
  const distUnit = weightUnit === "LBS" ? "MI" : "KM";
  const { t, dateLocale } = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const focuses = Array.from(new Set(sets.map((s) => s.exercise.focus)));

  async function handleDelete() {
    if (!sessionId) return;
    setDeleting(true);
    const res = await fetch(`/api/workouts/${sessionId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error(t("Couldn't delete the workout."));
      return;
    }
    toast.success(t("Workout deleted."));
    setConfirmOpen(false);
    onDeleted?.();
    router.refresh();
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex flex-col gap-3 px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {authorName && <span className="text-sm font-medium">{authorName}</span>}
            <span className="text-sm font-semibold">
              {new Date(date).toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {focuses.map((f) => (
              <Badge key={f} variant="secondary" className="text-[10px]">
                {t(FOCUS_LABEL[f])}
              </Badge>
            ))}
            {sessionId && (
              <>
                <Button
                  render={<Link href={`/dashboard/workouts/new?edit=${sessionId}`} />}
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                >
                  <Pencil className="size-3.5" />
                  {t("Edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  title={t("Delete")}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
          >
            <span className="text-base">
              <BoldNumbers
                text={[
                  new Set(sets.map((s) => s.exercise.name)).size === 1
                    ? t("1 exercise")
                    : t("{n} exercises", { n: new Set(sets.map((s) => s.exercise.name)).size }),
                  sets.length === 1 ? t("1 set") : t("{n} sets", { n: sets.length }),
                ].join(" · ")}
              />
              {prSetIds && sets.some((s) => prSetIds.has(s.id)) ? " · 🏆" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span>{expanded ? t("Hide details") : t("Show details")}</span>
              <ChevronDown className={cn("size-5 transition-transform", expanded && "rotate-180")} />
            </span>
          </button>
        )}
        <ul className={cn("flex flex-col gap-1 text-sm", collapsible && !expanded && "hidden")}>
          {sets.map((set) => {
            const isPr = prSetIds?.has(set.id) ?? false;
            const typeBadge = set.setType ? SET_TYPE_BADGE[set.setType] : undefined;
            return (
              <li key={set.id} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-foreground/90">
                  <span className="flex items-center gap-1.5">
                    {typeBadge && (
                      <span
                        title={t(SET_TYPE_LABEL_FULL[set.setType!])}
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
                        title={t("New personal record")}
                        className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500"
                      >
                        <Trophy className="size-3" />
                        PR
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {set.durationSec != null
                      ? set.distanceMeters != null
                        ? `${formatDurationSec(set.durationSec)}, ${formatDistance(set.distanceMeters, distUnit)}${distanceUnitLabel(distUnit)}`
                        : set.weightKg
                          ? `${formatDurationSec(set.durationSec)} @ ${format(set.weightKg)}${unitLabel}`
                          : formatDurationSec(set.durationSec)
                      : `${set.reps ?? "-"} × ${format(set.weightKg ?? 0)}${unitLabel}`}
                  </span>
                </div>
                {set.notes && <p className="text-xs italic text-muted-foreground">{set.notes}</p>}
              </li>
            );
          })}
        </ul>

        {photos && photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <ImageLightbox
                key={p.id}
                src={`/api/workout-photos/${p.id}`}
                alt={t("Pump pic")}
                thumbClassName="max-h-32 max-w-40"
              />
            ))}
          </div>
        )}

        {(perceivedExertion != null || skinCondition != null) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {perceivedExertion != null && <span>{t("Effort {n}/10", { n: perceivedExertion })}</span>}
            {skinCondition != null && <span>{t("Skin {n}/10", { n: skinCondition })}</span>}
          </div>
        )}

        {notes && <p className="text-sm italic text-muted-foreground">{notes}</p>}
      </CardContent>

      {sessionId && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete workout?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("This can't be undone. Group posts that were already shared stay, but lose their link to this workout.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction disabled={deleting} onClick={handleDelete}>
                {deleting ? t("Deleting…") : t("Delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
