import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { syncWorkoutRepsToChallenges } from "@/lib/challenge-workout-sync";

const goalSchema = z.object({ targetReps: z.number().int().positive().max(10000) });

export async function POST(
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

  const dc = await prisma.groupDailyChallenge.findUnique({ where: { id: dailyChallengeId } });
  if (!dc || dc.groupId !== groupId || !dc.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const goal = await prisma.userChallengeGoal.upsert({
    where: { groupDailyChallengeId_userId: { groupDailyChallengeId: dailyChallengeId, userId: session.user.id } },
    create: { groupDailyChallengeId: dailyChallengeId, userId: session.user.id, targetReps: parsed.data.targetReps },
    update: { targetReps: parsed.data.targetReps, isInvalidated: false },
  });

  // A changed target makes prior yammer votes stale - they were about the old number.
  await prisma.yammerVote.deleteMany({ where: { userChallengeGoalId: goal.id } });

  // Reps already logged in today's workouts count right away.
  await syncWorkoutRepsToChallenges(session.user.id);

  return NextResponse.json({ goal }, { status: 201 });
}
