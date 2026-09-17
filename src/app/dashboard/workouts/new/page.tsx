"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateExerciseDialog } from "@/components/create-exercise-dialog";

type Exercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
};

type SetRow = {
  key: number;
  exerciseId: string;
  reps: string;
  weightKg: string;
  durationSec: string;
};

let rowKey = 0;
const emptyRow = (exerciseId: string): SetRow => ({
  key: rowKey++,
  exerciseId,
  reps: "",
  weightKg: "",
  durationSec: "",
});

export default function NewWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [rows, setRows] = useState<SetRow[]>([]);
  const [perceivedExertion, setPerceivedExertion] = useState(5);
  const [skinCondition, setSkinCondition] = useState(1);
  const [trackSkin, setTrackSkin] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data: { exercises: Exercise[] }) => {
        setExercises(data.exercises);
        if (data.exercises.length > 0) {
          setRows([emptyRow(data.exercises[0].id)]);
        }
      });
  }, []);

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

  function addRow() {
    if (exercises.length === 0) return;
    setRows((prev) => [...prev, emptyRow(exercises[0].id)]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.length === 0) return;
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
    if (!res.ok) {
      toast.error("Konnte Workout nicht speichern.");
      return;
    }
    toast.success("Workout gespeichert!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Workout eintragen</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Sätze</CardTitle>
              <CardDescription>Übung wählen, Werte eintragen.</CardDescription>
            </div>
            <CreateExerciseDialog onCreated={handleExerciseCreated} />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {rows.map((row) => {
                const ex = exerciseFor(row.exerciseId);
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3">
                      <Select
                        value={row.exerciseId}
                        onValueChange={(value) => updateRow(row.key, { exerciseId: value as string })}
                      >
                        <SelectTrigger className="min-w-[140px] flex-1">
                          <SelectValue placeholder="Übung" />
                        </SelectTrigger>
                        <SelectContent>
                          {exercises.map((ex) => (
                            <SelectItem key={ex.id} value={ex.id}>
                              {ex.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

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
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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
                value={[perceivedExertion]}
                onValueChange={(v) => setPerceivedExertion((v as number[])[0])}
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
                    value={[skinCondition]}
                    onValueChange={(v) => setSkinCondition((v as number[])[0])}
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
