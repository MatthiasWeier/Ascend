import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { summarizeWorkoutSession } from "@/lib/workout-summary";

// Bulk-shares every one of the caller's workouts that isn't already shared
// into this group yet - a one-click backfill instead of picking sessions
// one at a time in the composer.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const [sessions, alreadyShared] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    prisma.groupPost.findMany({
      where: { groupId, userId: session.user.id, workoutSessionId: { not: null } },
      select: { workoutSessionId: true },
    }),
  ]);

  const sharedIds = new Set(alreadyShared.map((p) => p.workoutSessionId));
  const toShare = sessions.filter((s) => !sharedIds.has(s.id));

  if (toShare.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  await prisma.groupPost.createMany({
    data: toShare.map((s) => ({
      groupId,
      userId: session.user.id,
      type: "WORKOUT_SHARE" as const,
      content: summarizeWorkoutSession(s),
      workoutSessionId: s.id,
    })),
  });

  return NextResponse.json({ count: toShare.length }, { status: 201 });
}
