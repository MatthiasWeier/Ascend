type SummarizableSession = {
  date: Date;
  sets: {
    exercise: { name: string };
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
  }[];
};

export function summarizeWorkoutSession(session: SummarizableSession): string {
  const date = session.date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const lines = session.sets.map(
    (set) =>
      `${set.exercise.name}: ${
        set.durationSec != null ? `${set.durationSec}s` : `${set.reps ?? "-"}×${set.weightKg ?? 0}kg`
      }`
  );
  return `Workout vom ${date}\n${lines.join("\n")}`;
}
