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
  for (const set of sets) {
    if (set.exerciseId in lastValues) continue;
    lastValues[set.exerciseId] = {
      reps: set.reps,
      weightKg: set.weightKg,
      durationSec: set.durationSec,
    };
  }

  return NextResponse.json({ lastValues });
}
