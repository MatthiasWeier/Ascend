import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";

export type PendingChallenge = {
  groupId: string;
  groupName: string;
  templateName: string;
};

// A goal counts as "still to do today" if it's not vetoed and today's
// attempt either doesn't exist yet or was started but never finished -
// COMPLETED and ENDED_EARLY are both final for the day (only one attempt
// per goal per dateKey is allowed), so those don't need a reminder.
export async function getPendingDailyChallenges(userId: string): Promise<PendingChallenge[]> {
  const today = todayGermanDateKey();

  const goals = await prisma.userChallengeGoal.findMany({
    where: {
      userId,
      isInvalidated: false,
      groupDailyChallenge: { isActive: true },
    },
    include: {
      groupDailyChallenge: {
        include: {
          group: { select: { id: true, name: true } },
          challengeTemplate: { select: { name: true } },
        },
      },
      attempts: { where: { dateKey: today } },
    },
  });

  return goals
    .filter((g) => {
      const attempt = g.attempts[0];
      return !attempt || attempt.status === "IN_PROGRESS";
    })
    .map((g) => ({
      groupId: g.groupDailyChallenge.group.id,
      groupName: g.groupDailyChallenge.group.name,
      templateName: g.groupDailyChallenge.challengeTemplate.name,
    }));
}

export type ChallengeToRate = {
  attemptId: string;
  groupName: string;
  templateName: string;
  currentReps: number;
  targetRepsSnapshot: number;
};

// Today's attempts still waiting on a difficulty rating - including ones
// completed automatically from workout reps (challenge-workout-sync.ts),
// which never go through the execution dialog that normally prompts for
// this. Same eligibility as POST /api/challenge-attempts/[id]/rate: either
// terminal (COMPLETED/ENDED_EARLY) or at least half the target.
export async function getChallengesNeedingRating(userId: string): Promise<ChallengeToRate[]> {
  const today = todayGermanDateKey();

  const attempts = await prisma.dailyChallengeAttempt.findMany({
    where: {
      dateKey: today,
      difficultyRating: null,
      userChallengeGoal: { userId },
    },
    include: {
      userChallengeGoal: {
        include: {
          groupDailyChallenge: {
            include: {
              group: { select: { name: true } },
              challengeTemplate: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return attempts
    .filter((a) => a.status !== "IN_PROGRESS" || a.currentReps >= a.targetRepsSnapshot * 0.5)
    .map((a) => ({
      attemptId: a.id,
      groupName: a.userChallengeGoal.groupDailyChallenge.group.name,
      templateName: a.userChallengeGoal.groupDailyChallenge.challengeTemplate.name,
      currentReps: a.currentReps,
      targetRepsSnapshot: a.targetRepsSnapshot,
    }));
}
