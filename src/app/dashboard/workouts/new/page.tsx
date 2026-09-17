"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Check, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { CreateExerciseDialog } from "@/components/create-exercise-dialog";
import { cn } from "@/lib/utils";

type Exercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
};

type LastValues = Record<
  string,
  { reps: number | null; weightKg: number | null; durationSec: number | null }
>;

type SetRow = {
  key: number;
  exerciseId: string;
  reps: string;
  weightKg: string;
  durationSec: string;
  done: boolean;
};

let rowKey = 0;
const emptyRow = (exerciseId: string = ""): SetRow => ({
  key: rowKey++,
  exerciseId,
  reps: "",
  weightKg: "",
  durationSec: "",
  done: false,
});

const REST_PRESETS = [60, 90, 120, 180];

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastValues, setLastValues] = useState<LastValues>({});
  const [rows, setRows] = useState<SetRow[]>([]);
  const [perceivedExertion, setPerceivedExertion] = useState(5);
  const [skinCondition, setSkinCondition] = useState(1);
  const [trackSkin, setTrackSkin] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restPreset, setRestPreset] = useState(90);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()) as Promise<{ exercises: Exercise[] }>,
      fetch("/api/exercises/last-values").then((r) => r.json()) as Promise<{ lastValues: LastValues }>,
    ]).then(([exercisesRes, lastValuesRes]) => {
      setExercises(exercisesRes.exercises);
      setLastValues(lastValuesRes.lastValues);
      setRows([emptyRow()]);
    });
  }, []);

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      toast.success("Pause vorbei - weiter geht's!");
      setRestSecondsLeft(null);
      return;
    }
    const t = setTimeout(() => setRestSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [restSecondsLeft]);

  function handleExerciseCreated(newExercise: Exercise) {
    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
    setRows((prev) => [...prev, emptyRow(newExercise.id)]);
  }

  function exerciseFor(id: string) {
    return exercises.find((e) => e.id === id);
  }

  function updateRow(key: number, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleExerciseChange(key: number, exerciseId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const last = lastValues[exerciseId];
        const patch: Partial<SetRow> = { exerciseId };
        // Auto-fill from the last time this exercise was logged - only into
        // fields the user hasn't already touched, so it never clobbers a
        // value someone's already typed.
        if (last) {
          if (r.reps === "" && last.reps != null) patch.reps = String(last.reps);
          if (r.weightKg === "" && last.weightKg != null) patch.weightKg = String(last.weightKg);
          if (r.durationSec === "" && last.durationSec != null) patch.durationSec = String(last.durationSec);
        }
        return { ...r, ...patch };
      })
    );
  }

  function addRow() {
    if (exercises.length === 0) return;
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function markDone(key: number) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, done: !r.done } : r)));
    const row = rows.find((r) => r.key === key);
    if (!row?.done) {
      setRestSecondsLeft(restPreset);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.length === 0) return;
    if (rows.some((r) => !r.exerciseId)) {
      toast.error("Bitte für jeden Satz eine Übung wählen.");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    const payload = {
      notes: notes || undefined,
      perceivedExertion,
      skinCondition: trackSkin ? skinCondition : undefined,
      sets: rows.map((r) => {
        const ex = exerciseFor(r.exerciseId);
        if (ex?.type === "HOLD") {
          return { exerciseId: r.exerciseId, durationSec: Number(r.durationSec) };
        }
        return {
          exerciseId: r.exerciseId,
          reps: Number(r.reps),
          weightKg: r.weightKg === "" ? 0 : Number(r.weightKg),
        };
      }),
    };

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    submittingRef.current = false;
    if (!res.ok) {
      toast.error("Konnte Workout nicht speichern.");
      return;
    }

    const data: { newPrExerciseNames?: string[] } = await res.json();
    toast.success("Workout gespeichert!");
    for (const name of data.newPrExerciseNames ?? []) {
      toast(`🏆 Neuer PR: ${name}!`, { duration: 5000 });
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Workout eintragen</h1>

      {restSecondsLeft !== null && (
        <div className="sticky top-2 z-30 mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="size-4 text-primary" />
            Pause: <span className="font-mono tabular-nums">{formatMmSs(restSecondsLeft)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRestSecondsLeft((s) => (s ?? 0) + 15)}
            >
              +15s
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setRestSecondsLeft(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sätze</CardTitle>
            <CardDescription>Übung wählen, Werte eintragen. ✓ startet die Pause.</CardDescription>
            <CardAction>
              <CreateExerciseDialog onCreated={handleExerciseCreated} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Pause:</span>
              {REST_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRestPreset(p)}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    restPreset === p
                      ? "bg-primary/15 font-medium text-primary"
                      : "hover:bg-secondary"
                  )}
                >
                  {p}s
                </button>
              ))}
            </div>
            <>
              {rows.map((row) => {
                const ex = exerciseFor(row.exerciseId);
                return (
                  <div key={row.key} className="animate-in fade-in slide-in-from-top-2 overflow-hidden duration-200">
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-lg border p-3 transition-colors",
                        row.done ? "border-success/40 bg-success/5" : "border-border bg-secondary/40"
                      )}
                    >
                      <ExerciseCombobox
                        exercises={exercises}
                        value={row.exerciseId}
                        onChange={(id) => handleExerciseChange(row.key, id)}
                      />

                      {ex?.type === "HOLD" ? (
                        <Input
                          type="number"
                          min={1}
                          placeholder="Sek."
                          required
                          value={row.durationSec}
                          onChange={(e) => updateRow(row.key, { durationSec: e.target.value })}
                          className="w-20"
                        />
                      ) : (
                        <>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Wdh"
                            required
                            value={row.reps}
                            onChange={(e) => updateRow(row.key, { reps: e.target.value })}
                            className="w-16"
                          />
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="kg"
                            value={row.weightKg}
                            onChange={(e) => updateRow(row.key, { weightKg: e.target.value })}
                            className="w-16"
                          />
                        </>
                      )}
                      <Button
                        type="button"
                        variant={row.done ? "default" : "outline"}
                        size="icon"
                        className={cn("ml-auto", row.done && "bg-success text-success-foreground hover:bg-success/90")}
                        onClick={() => markDone(row.key)}
                        title="Satz fertig - startet die Pause"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
            <Button type="button" variant="outline" onClick={addRow} disabled={exercises.length === 0}>
              <Plus className="size-4" />
              Satz hinzufügen
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wie war's?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Anstrengung insgesamt</Label>
                <span className="text-sm font-medium text-primary">{perceivedExertion}/10</span>
              </div>
              <Slider
                value={perceivedExertion}
                onValueChange={(v) => setPerceivedExertion(v as number)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTrackSkin((v) => !v)}
                className="w-fit text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {trackSkin ? "Haut-Zustand ausblenden" : "+ Haut-Zustand erfassen (Klettern)"}
              </button>
              {trackSkin && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label>Haut-Zustand (10 = ruiniert)</Label>
                    <span className="text-sm font-medium text-primary">{skinCondition}/10</span>
                  </div>
                  <Slider
                    value={skinCondition}
                    onValueChange={(v) => setSkinCondition(v as number)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Optional…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={loading || rows.length === 0}>
          {loading ? "Speichern…" : "Workout speichern"}
        </Button>
      </form>
    </div>
  );
}
