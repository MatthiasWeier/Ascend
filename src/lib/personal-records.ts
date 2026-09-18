import { prisma } from "@/lib/prisma";
import { makeBodyWeightResolver, effectiveLoadKg } from "@/lib/bodyweight";

// Epley-estimated 1RM if there's an actual load (bodyweight and/or added
// weight); for a no-load rep exercise (e.g. plain sit-ups), more reps alone
// is the progression, so the raw rep count is the comparable value instead.
function repsValue(reps: number, loadKg: number): number {
  if (loadKg > 0) return loadKg * (1 + reps / 30);
  return reps;
}

// A hold with no load (bodyweight or added) is ranked by raw duration -
// unchanged from before added weight on holds was trackable. With a load,
// scale duration up the same way reps get scaled by load, so a weighted
// hold (e.g. a dead hang with a dumbbell clipped on) actually counts for
// more than an unweighted one of the same length - previously the weight
// was silently dropped and every hold was ranked by duration alone.
function holdValue(durationSec: number, loadKg: number): number {
  if (loadKg > 0) return durationSec * (1 + loadKg / 50);
  return durationSec;
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
        setType: true,
        session: { select: { date: true } },
        exercise: { select: { type: true, isBodyweight: true } },
      },
    }),
    makeBodyWeightResolver(userId),
  ]);

  const bestByExercise = new Map<string, number>();
  const prIds = new Set<string>();

  for (const set of sets) {
    if (set.setType === "WARMUP") continue;
    let value: number | null = null;
    if (set.exercise.type === "HOLD") {
      if (set.durationSec != null) {
        const bodyWeightKg = set.exercise.isBodyweight ? resolveBodyWeight(set.session.date) : null;
        const loadKg = effectiveLoadKg(set.exercise.isBodyweight, bodyWeightKg, set.weightKg ?? 0);
        value = holdValue(set.durationSec, loadKg);
      }
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

export type CurrentPR = {
  exerciseId: string;
  exerciseName: string;
  focus: string;
  type: "REPS" | "HOLD";
  bestValue: number;
  achievedAt: Date;
};

// Same chronological walk as computePrSetIds, but returns the full current
// best per exercise (value + when it was set) instead of just which sets
// were a PR at the time - for a "your records" overview page.
export async function getCurrentPRs(userId: string): Promise<CurrentPR[]> {
  const [sets, resolveBodyWeight] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId } },
      orderBy: [{ session: { date: "asc" } }, { order: "asc" }],
      select: {
        reps: true,
        weightKg: true,
        durationSec: true,
        exerciseId: true,
        setType: true,
        session: { select: { date: true } },
        exercise: { select: { name: true, focus: true, type: true, isBodyweight: true } },
      },
    }),
    makeBodyWeightResolver(userId),
  ]);

  const best = new Map<string, CurrentPR>();

  for (const set of sets) {
    if (set.setType === "WARMUP") continue;
    let value: number | null = null;
    if (set.exercise.type === "HOLD") {
      if (set.durationSec != null) {
        const bodyWeightKg = set.exercise.isBodyweight ? resolveBodyWeight(set.session.date) : null;
        const loadKg = effectiveLoadKg(set.exercise.isBodyweight, bodyWeightKg, set.weightKg ?? 0);
        value = holdValue(set.durationSec, loadKg);
      }
    } else if (set.reps != null) {
      const bodyWeightKg = set.exercise.isBodyweight ? resolveBodyWeight(set.session.date) : null;
      const loadKg = effectiveLoadKg(set.exercise.isBodyweight, bodyWeightKg, set.weightKg ?? 0);
      value = repsValue(set.reps, loadKg);
    }
    if (value == null) continue;

    const existing = best.get(set.exerciseId);
    if (!existing || value > existing.bestValue) {
      best.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseName: set.exercise.name,
        focus: set.exercise.focus,
        type: set.exercise.type,
        bestValue: value,
        achievedAt: set.session.date,
      });
    }
  }

  return Array.from(best.values()).sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
