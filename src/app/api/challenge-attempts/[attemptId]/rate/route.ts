import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rateSchema = z.object({ rating: z.number().int().min(1).max(5) });

// 1 (sehr einfach) -> Ziel steigt um 10%, ... 5 (sehr schwer) -> Ziel sinkt um 10%.
const ADJUSTMENT_PERCENT: Record<number, number> = {
  1: 0.1,
  2: 0.05,
  3: 0,
  4: -0.05,
  5: -0.1,
};

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
    include: { userChallengeGoal: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attempt.userChallengeGoal.userId !== session.user.id) {
    return NextResponse.json({ error: "That's not your attempt" }, { status: 403 });
  }
  if (attempt.difficultyRating != null) {
    return NextResponse.json({ error: "Already rated" }, { status: 400 });
  }

  const reachedHalf = attempt.currentReps >= attempt.targetRepsSnapshot * 0.5;
  const isTerminal = attempt.status === "COMPLETED" || attempt.status === "ENDED_EARLY";
  if (!reachedHalf && !isTerminal) {
    return NextResponse.json(
      { error: "Rating is only possible from 50% of the goal or after ending the challenge" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const percent = ADJUSTMENT_PERCENT[parsed.data.rating];
  const currentTarget = attempt.userChallengeGoal.targetReps;
  const newTarget = Math.max(1, Math.round(currentTarget * (1 + percent)));

  const [updatedAttempt] = await prisma.$transaction([
    prisma.dailyChallengeAttempt.update({
      where: { id: attemptId },
      data: {
        difficultyRating: parsed.data.rating,
        status: attempt.status === "IN_PROGRESS" ? "ENDED_EARLY" : attempt.status,
        completedAt: attempt.completedAt ?? new Date(),
      },
    }),
    prisma.userChallengeGoal.update({
      where: { id: attempt.userChallengeGoal.id },
      data: { targetReps: newTarget, isInvalidated: false },
    }),
    prisma.yammerVote.deleteMany({ where: { userChallengeGoalId: attempt.userChallengeGoal.id } }),
  ]);

  return NextResponse.json({ attempt: updatedAttempt, newTargetReps: newTarget });
}
