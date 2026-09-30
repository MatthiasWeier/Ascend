import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FOCUS_LABEL, ALL_FOCUSES, computeLoadPercents } from "@/lib/muscle-focus";
import { makeBodyWeightResolver } from "@/lib/bodyweight";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [sets, goals, resolveBodyWeight] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId } },
      select: {
        reps: true,
        weightKg: true,
        durationSec: true,
        setType: true,
        session: { select: { date: true } },
        exercise: { select: { focus: true, isBodyweight: true } },
      },
    }),
    prisma.balanceGoal.findMany({ where: { userId } }),
    makeBodyWeightResolver(userId),
  ]);

  const actualByFocus = computeLoadPercents(
    sets.map((s) => ({
      ...s,
      focus: s.exercise.focus,
      isBodyweight: s.exercise.isBodyweight,
      bodyWeightKg: s.exercise.isBodyweight ? resolveBodyWeight(s.session.date) : null,
    }))
  );
  const goalByFocus = new Map(goals.map((g) => [g.focus, g.targetPercent]));

  const data = ALL_FOCUSES.map((focus) => ({
    focus,
    label: FOCUS_LABEL[focus],
    actualPercent: actualByFocus[focus],
    goalPercent: goalByFocus.get(focus) ?? null,
  }));

  return NextResponse.json({ data, hasGoals: goals.length > 0 });
}
