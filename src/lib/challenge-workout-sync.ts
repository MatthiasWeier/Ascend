import { prisma } from "@/lib/prisma";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";
import { contributeChallengeAttemptToGoals } from "@/lib/goal-contributions";
import { notifyUsers } from "@/lib/notify";

// Reps logged in workouts count toward today's daily challenge of the same
// exercise: 100 push-ups in a workout finish a "100 push-ups" challenge
// without tapping through the challenge dialog. Only working sets count
// (warm-ups don't), and only REPS-type sets of the challenge's exercise.
//
// The attempt keeps two counters: manualReps (tapped in the dialog) and
// workoutReps (recomputed here from the day's sessions). currentReps is
// their sum. Group goals already get workout reps through their own
// workout-set contributions, so a finished attempt only contributes its
// manualReps - otherwise the same reps would be counted twice.

// Call after a workout was created/edited/deleted. `sessionDate` is the
// date of that workout: only workouts done today (Berlin) can move today's
// challenge, so anything else is a no-op.
export async function syncWorkoutRepsToChallenges(userId: string, sessionDate: Date = new Date()) {
  const dateKey = todayGermanDateKey();
  if (germanDateKey(sessionDate) !== dateKey) return;

  const goals = await prisma.userChallengeGoal.findMany({
    where: {
      userId,
      isInvalidated: false,
      groupDailyChallenge: { group: { members: { some: { userId } } } },
    },
    select: {
      id: true,
      targetReps: true,
      user: { select: { name: true } },
      groupDailyChallenge: {
        select: {
          groupId: true,
          group: { select: { name: true } },
          challengeTemplate: { select: { name: true, exerciseId: true } },
        },
      },
      attempts: { where: { dateKey }, take: 1 },
    },
  });
  if (goals.length === 0) return;

  // Berlin day boundaries, with a generous UTC window that is filtered
  // exactly by dateKey below (a session's Berlin day can differ from UTC's).
  const from = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const sets = await prisma.workoutSet.findMany({
    where: {
      session: { userId, date: { gte: from } },
      exerciseId: { in: goals.map((g) => g.groupDailyChallenge.challengeTemplate.exerciseId) },
      setType: { not: "WARMUP" },
      reps: { not: null },
    },
    select: { exerciseId: true, reps: true, session: { select: { date: true } } },
  });
  const repsByExercise = new Map<string, number>();
  for (const set of sets) {
    if (germanDateKey(set.session.date) !== dateKey) continue;
    repsByExercise.set(set.exerciseId, (repsByExercise.get(set.exerciseId) ?? 0) + (set.reps ?? 0));
  }

  for (const goal of goals) {
    const { exerciseId, name: templateName } = goal.groupDailyChallenge.challengeTemplate;
    const workoutReps = repsByExercise.get(exerciseId) ?? 0;
    const attempt = goal.attempts[0];

    if (!attempt) {
      if (workoutReps <= 0) continue;
      const created = await prisma.dailyChallengeAttempt.create({
        data: {
          userChallengeGoalId: goal.id,
          dateKey,
          targetRepsSnapshot: goal.targetReps,
          workoutReps,
          currentReps: workoutReps,
        },
      });
      await finishIfReached(created, goal, exerciseId, templateName, userId);
      continue;
    }

    if (attempt.workoutReps === workoutReps) continue;
    // A challenge given up on stays given up.
    if (attempt.status === "ENDED_EARLY") {
      await prisma.dailyChallengeAttempt.update({
        where: { id: attempt.id },
        data: { workoutReps, currentReps: attempt.manualReps + workoutReps },
      });
      continue;
    }

    const currentReps = attempt.manualReps + workoutReps;
    // An edit/delete dropped a workout-completed attempt below its target
    // again: reopen it, unless the user already rated it (then it's settled).
    if (attempt.status === "COMPLETED" && currentReps < attempt.targetRepsSnapshot && attempt.difficultyRating == null) {
      await prisma.$transaction([
        prisma.groupGoalContribution.deleteMany({ where: { source: "CHALLENGE", sourceId: attempt.id } }),
        prisma.dailyChallengeAttempt.update({
          where: { id: attempt.id },
          data: { workoutReps, currentReps, status: "IN_PROGRESS", completedAt: null },
        }),
      ]);
      continue;
    }

    const updated = await prisma.dailyChallengeAttempt.update({
      where: { id: attempt.id },
      data: { workoutReps, currentReps },
    });
    if (updated.status === "IN_PROGRESS") {
      await finishIfReached(updated, goal, exerciseId, templateName, userId);
    }
  }
}

type Attempt = { id: string; currentReps: number; manualReps: number; targetRepsSnapshot: number };
type Goal = {
  user: { name: string };
  groupDailyChallenge: { groupId: string; group: { name: string } };
};

async function finishIfReached(attempt: Attempt, goal: Goal, exerciseId: string, templateName: string, userId: string) {
  if (attempt.currentReps < attempt.targetRepsSnapshot) return;
  const groupId = goal.groupDailyChallenge.groupId;

  await prisma.dailyChallengeAttempt.update({
    where: { id: attempt.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await contributeChallengeAttemptToGoals({
    attemptId: attempt.id,
    userId,
    groupId,
    exerciseId,
    finalReps: attempt.manualReps,
  });

  const others = await prisma.groupMember.findMany({
    where: { groupId, userId: { not: userId } },
    select: { userId: true },
  });
  if (others.length === 0) return;
  await notifyUsers(
    others.map((m) => m.userId),
    {
      type: "CHALLENGE_DONE",
      actorId: userId,
      actorName: goal.user.name,
      groupName: goal.groupDailyChallenge.group.name,
      snippet: templateName,
      url: `/dashboard/groups/${groupId}?tab=challenges`,
      pushTitle: "Challenge geschafft!",
      pushBody: `${goal.user.name} hat "${templateName}" geschafft`,
    }
  );
}
