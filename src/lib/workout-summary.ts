import { formatDurationSec } from "@/lib/duration-format";

type SummarizableSession = {
  date: Date;
  sets: {
    exercise: { name: string };
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    distanceMeters: number | null;
  }[];
};

export function summarizeWorkoutSession(session: SummarizableSession): string {
  const date = session.date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const lines = session.sets.map((set) => {
    if (set.durationSec != null) {
      const duration = formatDurationSec(set.durationSec);
      if (set.distanceMeters != null) return `${set.exercise.name}: ${duration}, ${Math.round(set.distanceMeters / 10) / 100}km`;
      if (set.weightKg) return `${set.exercise.name}: ${duration} @ ${set.weightKg}kg`;
      return `${set.exercise.name}: ${duration}`;
    }
    return `${set.exercise.name}: ${set.reps ?? "-"}×${set.weightKg ?? 0}kg`;
  });
  return `Workout vom ${date}\n${lines.join("\n")}`;
}
