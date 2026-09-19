import { prisma } from "@/lib/prisma";
import type { MuscleFocus } from "@prisma/client";

export type ActivityItem =
  | {
      kind: "WORKOUT_SHARE" | "CHAT_TEXT" | "CHAT_PHOTO";
      timestamp: Date;
      userId: string;
      userName: string;
      groupId: string;
      groupName: string;
      content: string | null;
      imageUrl: string | null;
      workoutSessionId: string | null;
      focuses: MuscleFocus[];
      postId: string;
      commentCount: number;
      photoIds: string[];
    }
  | {
      kind: "CHALLENGE_COMPLETED" | "CHALLENGE_ENDED_EARLY";
      timestamp: Date;
      userId: string;
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

  const commentRows = posts.length
    ? await prisma.postComment.groupBy({
        by: ["postId"],
        where: { postId: { in: posts.map((p) => p.id) }, deletedAt: null },
        _count: { _all: true },
      })
    : [];
  const commentCounts = new Map(commentRows.map((r) => [r.postId, r._count._all]));

  const shareIds = posts.map((p) => p.workoutSessionId).filter((id): id is string => id != null);
  const focusRows = shareIds.length
    ? await prisma.workoutSet.findMany({
        where: { sessionId: { in: shareIds }, setType: { not: "WARMUP" } },
        select: { sessionId: true, exercise: { select: { focus: true } } },
      })
    : [];
  const focusesBySession = new Map<string, Set<MuscleFocus>>();
  for (const row of focusRows) {
    const set = focusesBySession.get(row.sessionId) ?? new Set<MuscleFocus>();
    set.add(row.exercise.focus);
    focusesBySession.set(row.sessionId, set);
  }

  const photoRows = shareIds.length
    ? await prisma.workoutPhoto.findMany({
        where: { sessionId: { in: shareIds } },
        orderBy: { createdAt: "asc" },
        select: { id: true, sessionId: true },
      })
    : [];
  const photosBySession = new Map<string, string[]>();
  for (const row of photoRows) {
    if (!row.sessionId) continue;
    photosBySession.set(row.sessionId, [...(photosBySession.get(row.sessionId) ?? []), row.id]);
  }

  const items: ActivityItem[] = [
    ...posts.map((p) => {
      const kind: "WORKOUT_SHARE" | "CHAT_TEXT" | "CHAT_PHOTO" =
        p.type === "WORKOUT_SHARE" ? "WORKOUT_SHARE" : p.type === "PHOTO" ? "CHAT_PHOTO" : "CHAT_TEXT";
      return {
        kind,
        timestamp: p.createdAt,
        userId: p.userId,
        userName: p.user.name,
        groupId: p.group.id,
        groupName: p.group.name,
        content: p.content,
        imageUrl: p.imageUrl,
        workoutSessionId: p.workoutSessionId,
        focuses: Array.from(focusesBySession.get(p.workoutSessionId ?? "") ?? []),
        postId: p.id,
        photoIds: photosBySession.get(p.workoutSessionId ?? "") ?? [],
        commentCount: commentCounts.get(p.id) ?? 0,
      };
    }),
    ...attempts.map((a): ActivityItem => {
      const kind: "CHALLENGE_COMPLETED" | "CHALLENGE_ENDED_EARLY" =
        a.status === "COMPLETED" ? "CHALLENGE_COMPLETED" : "CHALLENGE_ENDED_EARLY";
      return {
        kind,
        timestamp: a.completedAt ?? a.startedAt,
        userId: a.userChallengeGoal.userId,
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
