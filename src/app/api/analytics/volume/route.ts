import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sets = await prisma.workoutSet.findMany({
    where: {
      session: { userId: session.user.id, date: { gte: since } },
      reps: { not: null },
      weightKg: { not: null },
    },
    select: { reps: true, weightKg: true, session: { select: { date: true } } },
  });

  const byDay = new Map<string, number>();
  for (const set of sets) {
    const day = set.session.date.toISOString().slice(0, 10);
    const volume = set.reps! * set.weightKg!;
    byDay.set(day, (byDay.get(day) ?? 0) + volume);
  }

  const points = Array.from(byDay.entries())
    .map(([date, volumeKg]) => ({ date, volumeKg: Math.round(volumeKg) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ points });
}
