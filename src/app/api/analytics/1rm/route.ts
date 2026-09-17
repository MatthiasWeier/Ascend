import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeBodyWeightResolver, effectiveLoadKg } from "@/lib/bodyweight";

// Epley formula: estimated 1-rep max from a set done at sub-max weight/reps.
function epley1RM(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exerciseId");
  if (!exerciseId) {
    return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { isBodyweight: true },
  });
  if (!exercise) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sets = await prisma.workoutSet.findMany({
    where: {
      exerciseId,
      session: { userId: session.user.id },
      reps: { not: null },
      weightKg: { not: null },
    },
    select: { reps: true, weightKg: true, session: { select: { date: true } } },
    orderBy: { session: { date: "asc" } },
  });

  const resolveBodyWeight = exercise.isBodyweight ? await makeBodyWeightResolver(session.user.id) : null;

  // Keep the best (highest) estimated 1RM per day.
  const byDay = new Map<string, number>();
  for (const set of sets) {
    const bodyWeight = resolveBodyWeight?.(set.session.date) ?? null;
    const load = effectiveLoadKg(exercise.isBodyweight, bodyWeight, set.weightKg);
    const est = epley1RM(load, set.reps!);
    const day = set.session.date.toISOString().slice(0, 10);
    if (!byDay.has(day) || byDay.get(day)! < est) {
      byDay.set(day, est);
    }
  }

  const points = Array.from(byDay.entries())
    .map(([date, oneRepMax]) => ({ date, oneRepMax: Math.round(oneRepMax * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ points, isBodyweight: exercise.isBodyweight });
}
