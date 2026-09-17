import { prisma } from "@/lib/prisma";
import { makeBodyWeightResolver, effectiveLoadKg } from "@/lib/bodyweight";

// Epley-estimated 1RM if there's an actual load (bodyweight and/or added
// weight); for a no-load rep exercise (e.g. plain sit-ups), more reps alone
// is the progression, so the raw rep count is the comparable value instead.
function repsValue(reps: number, loadKg: number): number {
  if (loadKg > 0) return loadKg * (1 + reps / 30);
  return reps;
}

// Walks a user's entire set history in chronological order and returns the
// ids of sets that were a new personal record *at the time they were
// logged* - i.e. strictly better than everything logged earlier for that
// exact exercise. The very first time an exercise is ever logged doesn't
// count (nothing to beat yet), which avoids every brand-new exercise
// trivially lighting up as a "PR".
export async function computePrSetIds(userId: string): Promise<Set<string>> {
  const [sets, resolveBodyWeight] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId } },
      orderBy: [{ session: { date: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        reps: true,
        weightKg: true,
        durationSec: true,
        exerciseId: true,
        session: { select: { date: true } },
        exercise: { select: { type: true, isBodyweight: true } },
      },
    }),
    makeBodyWeightResolver(userId),
  ]);

  const bestByExercise = new Map<string, number>();
  const prIds = new Set<string>();

  for (const set of sets) {
    let value: number | null = null;
    if (set.exercise.type === "HOLD") {
      value = set.durationSec;
    } else if (set.reps != null) {
      const bodyWeightKg = set.exercise.isBodyweight ? resolveBodyWeight(set.session.date) : null;
      const loadKg = effectiveLoadKg(set.exercise.isBodyweight, bodyWeightKg, set.weightKg ?? 0);
      value = repsValue(set.reps, loadKg);
    }
    if (value == null) continue;

    const best = bestByExercise.get(set.exerciseId);
    if (best === undefined) {
      bestByExercise.set(set.exerciseId, value);
    } else if (value > best) {
      bestByExercise.set(set.exerciseId, value);
      prIds.add(set.id);
    }
  }

  return prIds;
}
