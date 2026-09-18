export type WarmupSet = { percent: number; weightKg: number; reps: number };

// Classic ramp-up: light and higher rep at 40%, fewer reps as weight climbs
// toward the work set - potentiates without pre-fatiguing. Weight rounds to
// the nearest 1.25kg (smallest common plate) so it's actually loadable.
export function computeWarmupSets(targetWeightKg: number, targetReps: number): WarmupSet[] {
  if (targetWeightKg <= 0) return [];

  const steps: { percent: number; reps: number }[] = [
    { percent: 0.4, reps: Math.max(5, Math.round(targetReps * 1.5)) },
    { percent: 0.6, reps: Math.max(3, Math.round(targetReps)) },
    { percent: 0.8, reps: Math.max(1, Math.round(targetReps * 0.6)) },
  ];

  return steps
    .map((s) => ({
      percent: s.percent,
      weightKg: Math.round((targetWeightKg * s.percent) / 1.25) * 1.25,
      reps: s.reps,
    }))
    .filter((s) => s.weightKg > 0);
}
