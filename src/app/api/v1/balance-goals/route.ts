import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { computeLoadPercents, ALL_FOCUSES } from "@/lib/muscle-focus";
import { makeBodyWeightResolver } from "@/lib/bodyweight";

// Balance-Ziele (target training split) vs. actual, all-time - the same
// numbers the dashboard radar chart shows, as plain JSON.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sets, goals, resolveBodyWeight] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId: auth.userId } },
      select: {
        reps: true,
        weightKg: true,
        durationSec: true,
        setType: true,
        session: { select: { date: true } },
        exercise: { select: { focus: true, isBodyweight: true } },
      },
    }),
    prisma.balanceGoal.findMany({ where: { userId: auth.userId } }),
    makeBodyWeightResolver(auth.userId),
  ]);

  const actual = computeLoadPercents(
    sets.map((s) => ({
      ...s,
      focus: s.exercise.focus,
      isBodyweight: s.exercise.isBodyweight,
      bodyWeightKg: s.exercise.isBodyweight ? resolveBodyWeight(s.session.date) : null,
    }))
  );
  const targetByFocus = new Map(goals.map((g) => [g.focus, g.targetPercent]));

  return NextResponse.json({
    focuses: ALL_FOCUSES.map((focus) => ({
      focus,
      actualPercent: actual[focus],
      targetPercent: targetByFocus.get(focus) ?? null,
    })),
  });
}
