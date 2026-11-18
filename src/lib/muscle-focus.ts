import type { MuscleFocus, SetType } from "@prisma/client";
import { effectiveLoadKg } from "@/lib/effective-load";

export const FOCUS_LABEL: Record<MuscleFocus, string> = {
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Legs",
  CORE: "Core",
  GRIP: "Grip",
};

export const ALL_FOCUSES: MuscleFocus[] = ["PUSH", "PULL", "LEGS", "CORE", "GRIP"];

// "Load" per set: reps*weight for REPS exercises, durationSec for HOLD -
// scaled up by weight, e.g. a weighted dead hang counts for more than an
// unweighted one of the same length (both roughly proxy total
// time-under-tension / work done). For a bodyweight exercise (push-ups,
// pull-ups, dips, ...) the user's bodyweight counts as load just like it
// does for PRs/1RM (see lib/bodyweight.ts) - without this, bodyweight-only
// training (no added weight) contributes ~0 load and gets crowded out by
// any focus with weighted exercises, however little of it is actually
// done. A rep/hold with no resolvable load at all (never logged a
// bodyweight, no added weight) falls back to raw reps/duration, same
// precedent as lib/personal-records.ts. Warm-up sets are excluded - they're
// not working sets. Returns each focus's share of the user's all-time
// training load, as a percent 0-100.
export function computeLoadPercents(
  sets: {
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    focus: MuscleFocus;
    setType: SetType;
    isBodyweight: boolean;
    bodyWeightKg: number | null;
  }[]
): Record<MuscleFocus, number> {
  const loadByFocus = new Map<MuscleFocus, number>();
  for (const s of sets) {
    if (s.setType === "WARMUP") continue;
    const loadKg = effectiveLoadKg(s.isBodyweight, s.bodyWeightKg, s.weightKg);
    const load =
      s.durationSec != null
        ? loadKg > 0
          ? s.durationSec * (1 + loadKg / 50)
          : s.durationSec
        : loadKg > 0
          ? (s.reps ?? 0) * loadKg
          : (s.reps ?? 0);
    loadByFocus.set(s.focus, (loadByFocus.get(s.focus) ?? 0) + load);
  }
  const totalLoad = Array.from(loadByFocus.values()).reduce((a, b) => a + b, 0);

  const result = {} as Record<MuscleFocus, number>;
  for (const focus of ALL_FOCUSES) {
    result[focus] = totalLoad > 0 ? Math.round(((loadByFocus.get(focus) ?? 0) / totalLoad) * 1000) / 10 : 0;
  }
  return result;
}
