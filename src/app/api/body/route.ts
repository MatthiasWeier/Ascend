import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMuscleStats } from "@/lib/muscle-stats";
import { getActiveInjuries } from "@/lib/injuries-server";
import { MUSCLE_BODY_PARTS } from "@/lib/injuries";
import { heatLevel } from "@/lib/body-model";
import { ALL_MUSCLES } from "@/lib/muscles";

export const dynamic = "force-dynamic";

const WINDOWS = [7, 14, 30];

// Everything the body map needs: per-muscle training level for the chosen
// window, the user's wishes and which muscles an active injury touches.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = WINDOWS.includes(requested) ? requested : 14;

  const [stats, wishes, injuries] = await Promise.all([
    getMuscleStats(userId, days),
    prisma.musclePreference.findMany({ where: { userId }, select: { muscle: true, wish: true } }),
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

  return NextResponse.json({ days, muscles });
}
