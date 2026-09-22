import { prisma } from "@/lib/prisma";
import { getMuscleStats } from "@/lib/muscle-stats";
import { getActiveInjuries } from "@/lib/injuries-server";
import { MUSCLE_BODY_PARTS } from "@/lib/injuries";
import { heatLevel } from "@/lib/body-model";
import { ALL_MUSCLES } from "@/lib/muscles";

export const BODY_WINDOWS = [7, 14, 30];

// Everything the body map needs. `sharedInGroupId` scopes both the training
// load and (for consistency) is passed through untouched for injuries -
// injuries aren't per-group, a teammate sees all of them, same as the note.
// `includeWishes` is false for a teammate's view - wishes stay personal.
export async function getBodyData(userId: string, days: number, options?: { sharedInGroupId?: string; includeWishes?: boolean }) {
  const includeWishes = options?.includeWishes ?? true;

  const [stats, wishes, injuries] = await Promise.all([
    getMuscleStats(userId, days, { sharedInGroupId: options?.sharedInGroupId }),
    includeWishes
      ? prisma.musclePreference.findMany({ where: { userId }, select: { muscle: true, wish: true } })
      : Promise.resolve([]),
    getActiveInjuries(userId),
  ]);
  const wishByMuscle = new Map(wishes.map((w) => [w.muscle, w.wish]));
  const injuredParts = new Set(injuries.map((i) => i.bodyPart));

  const muscles = ALL_MUSCLES.map((muscle) => {
    const stat = stats.find((s) => s.muscle === muscle)!;
    const perWeek = stat.load / (days / 7);
    return {
      muscle,
      perWeek: Math.round(perWeek * 10) / 10,
      level: heatLevel(perWeek),
      daysSince: stat.daysSince,
      wish: wishByMuscle.get(muscle) ?? 0,
      injured: MUSCLE_BODY_PARTS[muscle].some((p) => injuredParts.has(p)),
    };
  });

  return {
    days,
    muscles,
    injuries: injuries.map((i) => ({ id: i.id, bodyPart: i.bodyPart, severity: i.severity, note: i.note })),
  };
}
