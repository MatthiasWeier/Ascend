"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { computeWarmupSets } from "@/lib/warmup-calculator";
import { useWeightUnit } from "@/components/weight-unit-context";
import { useT } from "@/components/locale-provider";

// targetWeightKg/onInsert stay in kg (canonical) - only the dialog's own
// display text is shown in the user's chosen unit.
export function WarmupCalculatorDialog({
  targetWeightKg,
  targetReps,
  onInsert,
}: {
  targetWeightKg: number;
  targetReps: number;
  onInsert: (sets: { weightKg: number; reps: number }[]) => void;
}) {
  const { format, unitLabel } = useWeightUnit();
  const t = useT();
  const [open, setOpen] = useState(false);
  const sets = computeWarmupSets(targetWeightKg, targetReps || 8);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" title={t("Aufwärm-Rechner")} />
        }
      >
        <Layers className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Aufwärm-Sätze")}</DialogTitle>
          <DialogDescription>
            {t("Vorschlag basierend auf {weight} Arbeitsgewicht - wird als Aufwärmsätze vor diesem Satz eingefügt.", { weight: `${format(targetWeightKg)}${unitLabel}` })}
          </DialogDescription>
        </DialogHeader>
        {sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Bitte zuerst ein Zielgewicht eintragen.")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {sets.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{Math.round(s.percent * 100)}%</span>
                <span className="font-medium tabular-nums">
                  {format(s.weightKg)}{unitLabel} × {s.reps}
                </span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            disabled={sets.length === 0}
            onClick={() => {
              onInsert(sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })));
              setOpen(false);
            }}
          >
            {t("Einfügen")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
