import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributeChallengeAttemptToGoals } from "@/lib/goal-contributions";
import { notifyUsers } from "@/lib/notify";

const incrementSchema = z.object({ amount: z.number().int().refine((n) => [1, 2, 5, 10].includes(n)) });

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
          user: { select: { name: true } },
          groupDailyChallenge: {
            select: {
              groupId: true,
              challengeTemplate: { select: { name: true, exerciseId: true } },
            },
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
    return NextResponse.json({ error: "Versuch ist bereits abgeschlossen" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = incrementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const newReps = attempt.currentReps + parsed.data.amount;
  const justCompleted = newReps >= attempt.targetRepsSnapshot;

  const updated = await prisma.dailyChallengeAttempt.update({
    where: { id: attemptId },
    data: {
      currentReps: newReps,
      manualReps: { increment: parsed.data.amount },
      ...(justCompleted ? { status: "COMPLETED", completedAt: new Date() } : {}),
    },
  });

  if (justCompleted) {
    const groupId = attempt.userChallengeGoal.groupDailyChallenge.groupId;
    await contributeChallengeAttemptToGoals({
      attemptId,
      userId: attempt.userChallengeGoal.userId,
      groupId,
      exerciseId: attempt.userChallengeGoal.groupDailyChallenge.challengeTemplate.exerciseId,
      finalReps: updated.manualReps,
    });

    const otherMembers = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: session.user.id } },
      select: { userId: true },
    });
    if (otherMembers.length > 0) {
      const templateName = attempt.userChallengeGoal.groupDailyChallenge.challengeTemplate.name;
      const groupRow = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
      await notifyUsers(
        otherMembers.map((m) => m.userId),
        {
          type: "CHALLENGE_DONE",
          actorId: session.user.id,
          actorName: attempt.userChallengeGoal.user.name,
          groupName: groupRow?.name ?? "",
          snippet: templateName,
          url: `/dashboard/groups/${groupId}?tab=challenges`,
          pushTitle: "Challenge geschafft!",
          pushBody: `${attempt.userChallengeGoal.user.name} hat "${templateName}" geschafft`,
        }
      );
    }
  }

  return NextResponse.json({ attempt: updated });
}
