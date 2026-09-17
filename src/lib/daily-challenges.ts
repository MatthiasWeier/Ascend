import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";

export const MAX_ACTIVE_DAILY_CHALLENGES = 4;
export const YAMMER_THRESHOLD = 0.75;

export async function buildDailyChallengesView(groupId: string, viewerId: string) {
  const today = todayGermanDateKey();

  const [memberCount, dailyChallenges] = await Promise.all([
    prisma.groupMember.count({ where: { groupId } }),
    prisma.groupDailyChallenge.findMany({
      where: { groupId, isActive: true },
      include: {
        challengeTemplate: { include: { exercise: { select: { name: true } } } },
        goals: {
          include: {
            user: { select: { id: true, name: true } },
            votes: { select: { voterId: true } },
            attempts: { where: { dateKey: today } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const eligibleVoters = Math.max(0, memberCount - 1);
  const votesNeeded = Math.ceil(eligibleVoters * YAMMER_THRESHOLD);

  const data = dailyChallenges.map((dc) => ({
    id: dc.id,
    templateName: dc.challengeTemplate.name,
    templateDescription: dc.challengeTemplate.description,
    exerciseName: dc.challengeTemplate.exercise.name,
    stakes: dc.stakes,
    goals: dc.goals.map((g) => ({
      id: g.id,
      userId: g.user.id,
      userName: g.user.name,
      targetReps: g.targetReps,
      isInvalidated: g.isInvalidated,
      isMe: g.user.id === viewerId,
      voteCount: g.votes.length,
      votesNeeded,
      myVote: g.votes.some((v) => v.voterId === viewerId),
      canVote: g.user.id !== viewerId,
      todayAttempt: g.attempts[0]
        ? {
            id: g.attempts[0].id,
            currentReps: g.attempts[0].currentReps,
            targetRepsSnapshot: g.attempts[0].targetRepsSnapshot,
            status: g.attempts[0].status,
            completedAt: g.attempts[0].completedAt,
            difficultyRating: g.attempts[0].difficultyRating,
          }
        : null,
    })),
  }));

  return {
    dailyChallenges: data,
    activeCount: dailyChallenges.length,
    canActivateMore: dailyChallenges.length < MAX_ACTIVE_DAILY_CHALLENGES,
  };
}
