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
