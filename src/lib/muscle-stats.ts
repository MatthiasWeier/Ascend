import { prisma } from "@/lib/prisma";
import type { Muscle } from "@prisma/client";
import { ALL_MUSCLES, ROLE_WEIGHT, resolveExerciseMuscles } from "@/lib/muscles";

export type MuscleStat = {
  muscle: Muscle;
  // Weighted working sets in the window (primary = 1, secondary = 0.5).
  load: number;
  lastTrained: Date | null;
  daysSince: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 90;

// Per-muscle training picture: how much load in the last `windowDays` and
// when each muscle was last worked at all (looking back 90 days). Warm-up
// sets don't count.
export async function getMuscleStats(userId: string, windowDays = 14): Promise<MuscleStat[]> {
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS);
  const windowStart = now.getTime() - windowDays * DAY_MS;

  const sets = await prisma.workoutSet.findMany({
    where: { session: { userId, date: { gte: since } }, setType: { not: "WARMUP" } },
    select: {
      session: { select: { date: true } },
      exercise: { select: { focus: true, muscles: { select: { muscle: true, role: true } } } },
    },
  });

  const load = new Map<Muscle, number>();
  const last = new Map<Muscle, Date>();
  for (const set of sets) {
    const rows = resolveExerciseMuscles(set.exercise.focus, set.exercise.muscles);
    for (const { muscle, role } of rows) {
      if (set.session.date.getTime() >= windowStart) {
        load.set(muscle, (load.get(muscle) ?? 0) + ROLE_WEIGHT[role]);
      }
      const prev = last.get(muscle);
      if (!prev || set.session.date > prev) last.set(muscle, set.session.date);
    }
  }

  return ALL_MUSCLES.map((muscle) => {
    const lastTrained = last.get(muscle) ?? null;
    return {
      muscle,
      load: load.get(muscle) ?? 0,
      lastTrained,
      daysSince: lastTrained ? Math.floor((now.getTime() - lastTrained.getTime()) / DAY_MS) : null,
    };
  });
}
