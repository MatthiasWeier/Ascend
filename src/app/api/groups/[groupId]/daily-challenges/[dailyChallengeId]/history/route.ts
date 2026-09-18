import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// Retroactive view of who did (or didn't) this challenge on which day,
// and how far they got if only partially. One row per attempt, grouped by
// member, newest first.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; dailyChallengeId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, dailyChallengeId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const dailyChallenge = await prisma.groupDailyChallenge.findUnique({
    where: { id: dailyChallengeId },
  });
  if (!dailyChallenge || dailyChallenge.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const goals = await prisma.userChallengeGoal.findMany({
    where: { groupDailyChallengeId: dailyChallengeId },
    include: {
      user: { select: { id: true, name: true } },
      attempts: { orderBy: { dateKey: "desc" }, take: 60 },
    },
  });

  const members = goals.map((goal) => ({
    userId: goal.user.id,
    userName: goal.user.name,
    history: goal.attempts.map((a) => ({
      dateKey: a.dateKey,
      status: a.status,
      currentReps: a.currentReps,
      targetRepsSnapshot: a.targetRepsSnapshot,
      percent: a.targetRepsSnapshot > 0 ? Math.min(100, Math.round((a.currentReps / a.targetRepsSnapshot) * 100)) : 0,
    })),
  }));

  return NextResponse.json({ members });
}
