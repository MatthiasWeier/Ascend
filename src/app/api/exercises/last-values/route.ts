import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Last logged reps/weight/duration per exercise, for auto-filling the "new
// workout" form. Ordered newest-session-first, then last-entered-within-that-
// session first, and we only keep the first (= most recent) hit per
// exercise.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sets = await prisma.workoutSet.findMany({
    where: { session: { userId: session.user.id } },
    orderBy: [{ session: { date: "desc" } }, { order: "desc" }],
    select: { exerciseId: true, reps: true, weightKg: true, durationSec: true },
    take: 1000,
  });

  const lastValues: Record<
    string,
    { reps: number | null; weightKg: number | null; durationSec: number | null }
  > = {};
  const useCount = new Map<string, number>();
  for (const set of sets) {
    useCount.set(set.exerciseId, (useCount.get(set.exerciseId) ?? 0) + 1);
    if (set.exerciseId in lastValues) continue;
    lastValues[set.exerciseId] = {
      reps: set.reps,
      weightKg: set.weightKg,
      durationSec: set.durationSec,
    };
  }

  // Most-used exercises (by set count within the same 1000-set window),
  // for the quick-add chips on the workout entry page.
  const mostUsedExerciseIds = Array.from(useCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([exerciseId]) => exerciseId);

  return NextResponse.json({ lastValues, mostUsedExerciseIds });
}
