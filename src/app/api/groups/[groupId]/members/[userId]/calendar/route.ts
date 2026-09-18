import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// Same shape as /api/analytics/calendar, but scoped to what a group member
// actually shared into this group - never their private full history.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId } = await params;

  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
      sharedPosts: { some: { groupId } },
    },
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
