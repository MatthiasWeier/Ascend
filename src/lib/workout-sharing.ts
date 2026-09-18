import { prisma } from "@/lib/prisma";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { sendPushToUsers } from "@/lib/push";

type SummarizableSession = Parameters<typeof summarizeWorkoutSession>[0] & { id: string };

// Shares one freshly-created workout into every group where its owner has
// auto-share turned on. `skipDuplicates` makes this safe to call more than
// once for the same session without erroring or double-posting. Also
// pushes a notification to everyone else in each of those groups - fire
// and forget, a failed/slow push should never hold up saving the workout.
export async function autoShareToGroups(
  userId: string,
  workoutSession: SummarizableSession
): Promise<string[]> {
  const [memberships, actor] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId, autoShareWorkouts: true },
      select: {
        groupId: true,
        group: {
          select: {
            name: true,
            members: { where: { userId: { not: userId } }, select: { userId: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  if (memberships.length === 0) return [];

  await prisma.groupPost.createMany({
    data: memberships.map((m) => ({
      groupId: m.groupId,
      userId,
      type: "WORKOUT_SHARE" as const,
      content: summarizeWorkoutSession(workoutSession),
      workoutSessionId: workoutSession.id,
    })),
    skipDuplicates: true,
  });

  for (const m of memberships) {
    const otherUserIds = m.group.members.map((mem) => mem.userId);
    if (otherUserIds.length === 0) continue;
    sendPushToUsers(otherUserIds, {
      title: m.group.name,
      body: `${actor?.name ?? "Jemand"} hat ein Workout gepostet`,
      url: "/dashboard",
    }).catch(() => {});
  }

  return memberships.map((m) => m.group.name);
}

// Backfills every one of a user's workouts not yet shared into one
// specific group - used when auto-share is switched on, so the toggle
// doesn't just apply going forward. Returns how many were newly shared.
export async function shareAllUnsharedWorkouts(userId: string, groupId: string): Promise<number> {
  const [sessions, alreadyShared] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    prisma.groupPost.findMany({
      where: { groupId, userId, workoutSessionId: { not: null } },
      select: { workoutSessionId: true },
    }),
  ]);

  const sharedIds = new Set(alreadyShared.map((p) => p.workoutSessionId));
  const toShare = sessions.filter((s) => !sharedIds.has(s.id));
  if (toShare.length === 0) return 0;

  const result = await prisma.groupPost.createMany({
    data: toShare.map((s) => ({
      groupId,
      userId,
      type: "WORKOUT_SHARE" as const,
      content: summarizeWorkoutSession(s),
      workoutSessionId: s.id,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
