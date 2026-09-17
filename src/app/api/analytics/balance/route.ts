import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FOCUS_LABEL } from "@/lib/workout-brain";
import type { MuscleFocus } from "@prisma/client";

const ALL_FOCUSES: MuscleFocus[] = ["PUSH", "PULL", "LEGS", "CORE", "GRIP"];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [sets, goals] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId } },
      select: { reps: true, weightKg: true, durationSec: true, exercise: { select: { focus: true } } },
    }),
    prisma.balanceGoal.findMany({ where: { userId } }),
  ]);

  // "Load" per set: reps*weight for REPS exercises, durationSec for HOLD
  // (both roughly proxy total time-under-tension / work done).
  const loadByFocus = new Map<MuscleFocus, number>();
  for (const set of sets) {
    const load = set.durationSec != null ? set.durationSec : (set.reps ?? 0) * (set.weightKg ?? 0);
    loadByFocus.set(set.exercise.focus, (loadByFocus.get(set.exercise.focus) ?? 0) + load);
  }
  const totalLoad = Array.from(loadByFocus.values()).reduce((a, b) => a + b, 0);

  const goalByFocus = new Map(goals.map((g) => [g.focus, g.targetPercent]));

  const data = ALL_FOCUSES.map((focus) => ({
    focus,
    label: FOCUS_LABEL[focus],
    actualPercent: totalLoad > 0 ? Math.round(((loadByFocus.get(focus) ?? 0) / totalLoad) * 1000) / 10 : 0,
    goalPercent: goalByFocus.get(focus) ?? null,
  }));

  return NextResponse.json({ data, hasGoals: goals.length > 0 });
}
