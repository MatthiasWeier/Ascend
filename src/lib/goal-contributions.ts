import { prisma } from "@/lib/prisma";
import type { ExerciseType, GoalUnit } from "@prisma/client";

// Which GoalUnit an exercise type can auto-feed - a REPS exercise can only
// ever drive a REPS goal, a HOLD (timed) exercise only a DURATION_SEC one.
export function unitForExerciseType(type: ExerciseType): Extract<GoalUnit, "REPS" | "DURATION_SEC"> {
  return type === "HOLD" ? "DURATION_SEC" : "REPS";
}

export function goalUnitMatchesExerciseType(unit: GoalUnit, type: ExerciseType): boolean {
  return unit === unitForExerciseType(type);
}

// Called right after a WorkoutSet is created. Finds every GroupGoal - in
// any group the set's owner belongs to - linked to this exact exercise
// (and not past its deadline), and records one auto-contribution each.
// Never touches daily challenges - those stay a separate, manual flow.
export async function contributeWorkoutSetToGoals(params: {
  userId: string;
  exerciseId: string;
  reps: number | null;
  durationSec: number | null;
  workoutSetId: string;
}) {
  const { userId, exerciseId, reps, durationSec, workoutSetId } = params;

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((m) => m.groupId);
  if (myGroupIds.length === 0) return;

  const goals = await prisma.groupGoal.findMany({
    where: {
      groupId: { in: myGroupIds },
      exerciseId,
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    },
  });
  if (goals.length === 0) return;

  const data = goals.flatMap((goal) => {
    const amount = goal.unit === "DURATION_SEC" ? durationSec : reps;
    if (amount == null || amount <= 0) return [];
    return [{ goalId: goal.id, userId, amount, source: "WORKOUT" as const, sourceId: workoutSetId }];
  });
  if (data.length === 0) return;

  await prisma.groupGoalContribution.createMany({ data, skipDuplicates: true });
}

// Called once a DailyChallengeAttempt reaches a terminal state (COMPLETED
// or ENDED_EARLY). Contributes its final rep count to any GroupGoal *in
// that same group* linked to the challenge's exercise.
export async function contributeChallengeAttemptToGoals(params: {
  attemptId: string;
  userId: string;
  groupId: string;
  exerciseId: string;
  finalReps: number;
}) {
  const { attemptId, userId, groupId, exerciseId, finalReps } = params;
  if (finalReps <= 0) return;

  const goals = await prisma.groupGoal.findMany({
    where: {
      groupId,
      exerciseId,
      unit: "REPS",
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    },
  });
  if (goals.length === 0) return;

  await prisma.groupGoalContribution.createMany({
    data: goals.map((goal) => ({
      goalId: goal.id,
      userId,
      amount: finalReps,
      source: "CHALLENGE" as const,
      sourceId: attemptId,
    })),
    skipDuplicates: true,
  });
}

// Backfills a freshly exercise-linked goal from everything that already
// happened before the link existed: every group member's past workout
// sets for that exercise, and every past finished challenge attempt for
// it within this group. Returns how many contributions were added.
export async function backfillGoalFromHistory(goal: {
  id: string;
  groupId: string;
  exerciseId: string;
  unit: GoalUnit;
}): Promise<number> {
  const memberIds = (
    await prisma.groupMember.findMany({ where: { groupId: goal.groupId }, select: { userId: true } })
  ).map((m) => m.userId);
  if (memberIds.length === 0) return 0;

  type Row = { goalId: string; userId: string; amount: number; source: "WORKOUT" | "CHALLENGE"; sourceId: string };
  const rows: Row[] = [];

  const sets = await prisma.workoutSet.findMany({
    where: { exerciseId: goal.exerciseId, session: { userId: { in: memberIds } } },
    select: { id: true, reps: true, durationSec: true, session: { select: { userId: true } } },
  });
  for (const set of sets) {
    const amount = goal.unit === "DURATION_SEC" ? set.durationSec : set.reps;
    if (amount == null || amount <= 0) continue;
    rows.push({ goalId: goal.id, userId: set.session.userId, amount, source: "WORKOUT", sourceId: set.id });
  }

  if (goal.unit === "REPS") {
    const attempts = await prisma.dailyChallengeAttempt.findMany({
      where: {
        status: { in: ["COMPLETED", "ENDED_EARLY"] },
        userChallengeGoal: {
          userId: { in: memberIds },
          groupDailyChallenge: { groupId: goal.groupId, challengeTemplate: { exerciseId: goal.exerciseId } },
        },
      },
      select: { id: true, currentReps: true, userChallengeGoal: { select: { userId: true } } },
    });
    for (const attempt of attempts) {
      if (attempt.currentReps <= 0) continue;
      rows.push({
        goalId: goal.id,
        userId: attempt.userChallengeGoal.userId,
        amount: attempt.currentReps,
        source: "CHALLENGE",
        sourceId: attempt.id,
      });
    }
  }

  if (rows.length === 0) return 0;
  const result = await prisma.groupGoalContribution.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}
