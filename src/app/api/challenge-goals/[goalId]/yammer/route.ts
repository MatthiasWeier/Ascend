import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { YAMMER_THRESHOLD } from "@/lib/daily-challenges";

async function loadGoalWithGroup(goalId: string) {
  return prisma.userChallengeGoal.findUnique({
    where: { id: goalId },
    include: { groupDailyChallenge: { select: { groupId: true } } },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { goalId } = await params;

  const goal = await loadGoalWithGroup(goalId);
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const groupId = goal.groupDailyChallenge.groupId;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  if (goal.userId === session.user.id) {
    return NextResponse.json({ error: "You can't yammer against your own goal" }, { status: 400 });
  }

  await prisma.yammerVote.upsert({
    where: { userChallengeGoalId_voterId: { userChallengeGoalId: goalId, voterId: session.user.id } },
    create: { userChallengeGoalId: goalId, voterId: session.user.id },
    update: {},
  });

  await maybeInvalidate(goalId, groupId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { goalId } = await params;

  const goal = await loadGoalWithGroup(goalId);
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const membership = await getGroupMembership(session.user.id, goal.groupDailyChallenge.groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.yammerVote.deleteMany({ where: { userChallengeGoalId: goalId, voterId: session.user.id } });

  return NextResponse.json({ ok: true });
}

async function maybeInvalidate(goalId: string, groupId: string) {
  const [voteCount, memberCount] = await Promise.all([
    prisma.yammerVote.count({ where: { userChallengeGoalId: goalId } }),
    prisma.groupMember.count({ where: { groupId } }),
  ]);
  const eligibleVoters = Math.max(0, memberCount - 1);
  if (eligibleVoters > 0 && voteCount / eligibleVoters >= YAMMER_THRESHOLD) {
    await prisma.userChallengeGoal.update({ where: { id: goalId }, data: { isInvalidated: true } });
  }
}
