import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributeChallengeAttemptToGoals } from "@/lib/goal-contributions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { attemptId } = await params;

  const attempt = await prisma.dailyChallengeAttempt.findUnique({
    where: { id: attemptId },
    include: {
      userChallengeGoal: {
        select: {
          userId: true,
          groupDailyChallenge: {
            select: { groupId: true, challengeTemplate: { select: { exerciseId: true } } },
          },
        },
      },
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attempt.userChallengeGoal.userId !== session.user.id) {
    return NextResponse.json({ error: "Das ist nicht dein Versuch" }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ attempt });
  }

  const updated = await prisma.dailyChallengeAttempt.update({
    where: { id: attemptId },
    data: { status: "ENDED_EARLY", completedAt: new Date() },
  });

  await contributeChallengeAttemptToGoals({
    attemptId,
    userId: attempt.userChallengeGoal.userId,
    groupId: attempt.userChallengeGoal.groupDailyChallenge.groupId,
    exerciseId: attempt.userChallengeGoal.groupDailyChallenge.challengeTemplate.exerciseId,
    finalReps: attempt.manualReps,
  });

  return NextResponse.json({ attempt: updated });
}
