"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Exercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
};

type SetRow = {
  exerciseId: string;
  reps: string;
  weightKg: string;
  durationSec: string;
};

const emptyRow = (exerciseId: string): SetRow => ({
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
  const [skinCondition, setSkinCondition] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  function exerciseFor(id: string) {
    return exercises.find((e) => e.id === id);
  }

  function updateRow(index: number, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (exercises.length === 0) return;
    setRows((prev) => [...prev, emptyRow(exercises[0].id)]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      notes: notes || undefined,
      perceivedExertion,
      skinCondition: skinCondition === "" ? undefined : skinCondition,
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
      setError("Konnte Workout nicht speichern.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Workout eintragen</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const ex = exerciseFor(row.exerciseId);
            return (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded border border-gray-200 p-3 dark:border-gray-800">
                <select
                  value={row.exerciseId}
                  onChange={(e) => updateRow(index, { exerciseId: e.target.value })}
                  className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                {ex?.type === "HOLD" ? (
                  <input
                    type="number"
                    min={1}
                    placeholder="Sekunden"
                    required
                    value={row.durationSec}
                    onChange={(e) => updateRow(index, { durationSec: e.target.value })}
                    className="w-28 rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                  />
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      placeholder="Wdh"
                      required
                      value={row.reps}
                      onChange={(e) => updateRow(index, { reps: e.target.value })}
                      className="w-20 rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="kg"
                      value={row.weightKg}
                      onChange={(e) => updateRow(index, { weightKg: e.target.value })}
                      className="w-20 rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="ml-auto text-sm text-red-500"
                >
                  entfernen
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addRow}
            disabled={exercises.length === 0}
            className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
          >
            + Satz hinzufügen
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Anstrengung insgesamt (1-10)</span>
          <input
            type="range"
            min={1}
            max={10}
            value={perceivedExertion}
            onChange={(e) => setPerceivedExertion(Number(e.target.value))}
          />
          <span className="text-sm">{perceivedExertion}/10</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Haut-Zustand (1 = gut, 10 = ruiniert) — optional, für Kletterer</span>
          <input
            type="range"
            min={1}
            max={10}
            value={skinCondition === "" ? 1 : skinCondition}
            onChange={(e) => setSkinCondition(Number(e.target.value))}
          />
          <span className="text-sm">{skinCondition === "" ? "-" : `${skinCondition}/10`}</span>
        </label>

        <textarea
          placeholder="Notizen (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || rows.length === 0}
          className="rounded bg-black px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Speichern..." : "Workout speichern"}
        </button>
      </form>
    </main>
  );
}
