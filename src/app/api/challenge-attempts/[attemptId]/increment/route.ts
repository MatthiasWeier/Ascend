import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
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

  const { allowed } = await checkRateLimit(`increment:${session.user.id}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, please wait a moment." }, { status: 429 });
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
    return NextResponse.json({ error: "That's not your attempt" }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt is already finished" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = incrementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Atomic increments on both counters - the previous version computed
  // currentReps from the stale `attempt` read above and overwrote it
  // (`currentReps: newReps`), so two concurrent increments (double-tap,
  // retry on a flaky connection) could lose one of them: both read the
  // same starting value, both write their own newReps, last write wins.
  // manualReps was already atomic; currentReps now is too.
  let updated = await prisma.dailyChallengeAttempt.update({
    where: { id: attemptId },
    data: {
      currentReps: { increment: parsed.data.amount },
      manualReps: { increment: parsed.data.amount },
    },
  });

  // Completion is a separate, conditional step so two concurrent requests
  // that both push currentReps past the target can't both "just complete"
  // it - the `status: "IN_PROGRESS"` guard means only whichever request's
  // updateMany runs first while it's still IN_PROGRESS actually flips it;
  // the other affects 0 rows, so its justCompleted-gated side effects
  // (goal contribution, notification) correctly never fire.
  let justCompleted = false;
  if (updated.currentReps >= updated.targetRepsSnapshot) {
    const completion = await prisma.dailyChallengeAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    justCompleted = completion.count === 1;
    if (justCompleted) {
      updated = await prisma.dailyChallengeAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    }
  }

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
