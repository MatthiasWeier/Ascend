import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";
import { syncWorkoutRepsToChallenges } from "@/lib/challenge-workout-sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { goalId } = await params;

  const goal = await prisma.userChallengeGoal.findUnique({ where: { id: goalId } });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (goal.userId !== session.user.id) {
    return NextResponse.json({ error: "Das ist nicht dein Ziel" }, { status: 403 });
  }
  if (goal.isInvalidated) {
    return NextResponse.json(
      { error: "Dein Ziel wurde von der Gruppe angefochten - setz zuerst ein neues Ziel." },
      { status: 400 }
    );
  }

  // Picks up reps from today's workouts, creating the attempt if there are any.
  await syncWorkoutRepsToChallenges(session.user.id);

  const dateKey = todayGermanDateKey();

  const attempt = await prisma.dailyChallengeAttempt.upsert({
    where: { userChallengeGoalId_dateKey: { userChallengeGoalId: goalId, dateKey } },
    create: { userChallengeGoalId: goalId, dateKey, targetRepsSnapshot: goal.targetReps },
    update: {},
  });

  return NextResponse.json({ attempt }, { status: 201 });
}
