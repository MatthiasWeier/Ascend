import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One calendar day's workout(s) in full detail - what the activity
// heatmap links out to when a day is clicked. Uses the same UTC calendar-
// day boundary as /api/analytics/calendar so a click always matches
// exactly what was counted into that day's cell.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const start = new Date(`${dateParam}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: session.user.id, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sessions });
}
