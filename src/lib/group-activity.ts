import { prisma } from "@/lib/prisma";

export type ActivityItem =
  | {
      kind: "WORKOUT_SHARE" | "CHAT_TEXT" | "CHAT_PHOTO";
      timestamp: Date;
      userName: string;
      groupId: string;
      groupName: string;
      content: string | null;
    }
  | {
      kind: "CHALLENGE_COMPLETED" | "CHALLENGE_ENDED_EARLY";
      timestamp: Date;
      userName: string;
      groupId: string;
      groupName: string;
      templateName: string;
      currentReps: number;
      targetRepsSnapshot: number;
    };

// Cross-group "what's everyone up to" feed for the dashboard homepage -
// every workout someone shared and every challenge attempt someone
// finished, across every group the viewer belongs to, newest first.
export async function getRecentGroupActivity(userId: string, limit = 20): Promise<ActivityItem[]> {
  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((m) => m.groupId);
  if (myGroupIds.length === 0) return [];

  const [posts, attempts] = await Promise.all([
    prisma.groupPost.findMany({
      where: { groupId: { in: myGroupIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { name: true } }, group: { select: { id: true, name: true } } },
    }),
    prisma.dailyChallengeAttempt.findMany({
      where: {
        status: { in: ["COMPLETED", "ENDED_EARLY"] },
        userChallengeGoal: { groupDailyChallenge: { groupId: { in: myGroupIds } } },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
      include: {
        userChallengeGoal: {
          include: {
            user: { select: { name: true } },
            groupDailyChallenge: {
              include: {
                group: { select: { id: true, name: true } },
                challengeTemplate: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: ActivityItem[] = [
    ...posts.map((p) => {
      const kind: "WORKOUT_SHARE" | "CHAT_TEXT" | "CHAT_PHOTO" =
        p.type === "WORKOUT_SHARE" ? "WORKOUT_SHARE" : p.type === "PHOTO" ? "CHAT_PHOTO" : "CHAT_TEXT";
      return {
        kind,
        timestamp: p.createdAt,
        userName: p.user.name,
        groupId: p.group.id,
        groupName: p.group.name,
        content: p.content,
      };
    }),
    ...attempts.map((a): ActivityItem => {
      const kind: "CHALLENGE_COMPLETED" | "CHALLENGE_ENDED_EARLY" =
        a.status === "COMPLETED" ? "CHALLENGE_COMPLETED" : "CHALLENGE_ENDED_EARLY";
      return {
        kind,
        timestamp: a.completedAt ?? a.startedAt,
        userName: a.userChallengeGoal.user.name,
        groupId: a.userChallengeGoal.groupDailyChallenge.group.id,
        groupName: a.userChallengeGoal.groupDailyChallenge.group.name,
        templateName: a.userChallengeGoal.groupDailyChallenge.challengeTemplate.name,
        currentReps: a.currentReps,
        targetRepsSnapshot: a.targetRepsSnapshot,
      };
    }),
  ];

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return items.slice(0, limit);
}
