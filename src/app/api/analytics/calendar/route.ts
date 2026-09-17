import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: session.user.id, date: { gte: start, lt: end } },
    select: { date: true, perceivedExertion: true },
  });

  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const day = s.date.toISOString().slice(0, 10);
    const intensity = s.perceivedExertion ?? 5;
    byDay.set(day, (byDay.get(day) ?? 0) + intensity);
  }

  const days = Array.from(byDay.entries()).map(([date, intensity]) => ({ date, intensity }));

  return NextResponse.json({ year, days });
}
