import type { MuscleFocus } from "@prisma/client";

export const FOCUS_LABEL: Record<MuscleFocus, string> = {
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Beine",
  CORE: "Core",
  GRIP: "Grip",
};

export const ALL_FOCUSES: MuscleFocus[] = ["PUSH", "PULL", "LEGS", "CORE", "GRIP"];

// "Load" per set: reps*weight for REPS exercises, durationSec for HOLD
// (both roughly proxy total time-under-tension / work done). Returns each
// focus's share of the user's all-time training load, as a percent 0-100.
export function computeLoadPercents(
  sets: { reps: number | null; weightKg: number | null; durationSec: number | null; focus: MuscleFocus }[]
): Record<MuscleFocus, number> {
  const loadByFocus = new Map<MuscleFocus, number>();
  for (const s of sets) {
    const load = s.durationSec != null ? s.durationSec : (s.reps ?? 0) * (s.weightKg ?? 0);
    loadByFocus.set(s.focus, (loadByFocus.get(s.focus) ?? 0) + load);
  }
  const totalLoad = Array.from(loadByFocus.values()).reduce((a, b) => a + b, 0);

  const result = {} as Record<MuscleFocus, number>;
  for (const focus of ALL_FOCUSES) {
    result[focus] = totalLoad > 0 ? Math.round(((loadByFocus.get(focus) ?? 0) / totalLoad) * 1000) / 10 : 0;
  }
  return result;
}
