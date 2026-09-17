import { prisma } from "@/lib/prisma";
import { summarizeWorkoutSession } from "@/lib/workout-summary";

type SummarizableSession = Parameters<typeof summarizeWorkoutSession>[0] & { id: string };

// Shares one freshly-created workout into every group where its owner has
// auto-share turned on. `skipDuplicates` makes this safe to call more than
// once for the same session without erroring or double-posting.
export async function autoShareToGroups(
  userId: string,
  workoutSession: SummarizableSession
): Promise<string[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, autoShareWorkouts: true },
    select: { groupId: true, group: { select: { name: true } } },
  });
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
