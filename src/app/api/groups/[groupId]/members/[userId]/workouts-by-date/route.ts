import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// One calendar day's shared workout(s) for a specific group member - only
// sessions that member actually posted into this group, matching what
// /api/groups/[groupId]/members/[userId]/calendar counted for that day.
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
  const dateParam = searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const start = new Date(`${dateParam}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
      sharedPosts: { some: { groupId } },
    },
    orderBy: { date: "asc" },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sessions });
}
