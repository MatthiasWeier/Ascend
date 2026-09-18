import { prisma } from "@/lib/prisma";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";

// Consecutive German-calendar days with at least one workout, counting
// backward from today. If today has no workout yet, the streak isn't
// "broken" until the day is actually over - it just counts from
// yesterday instead, same as most habit-tracking apps.
export async function computeCurrentStreak(userId: string): Promise<number> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 400,
  });
  const dateKeys = new Set(sessions.map((s) => germanDateKey(s.date)));

  const cursor = new Date();
  let dateKey = todayGermanDateKey();
  if (!dateKeys.has(dateKey)) {
    cursor.setDate(cursor.getDate() - 1);
    dateKey = germanDateKey(cursor);
  }

  let streak = 0;
  while (dateKeys.has(dateKey)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    dateKey = germanDateKey(cursor);
  }
  return streak;
}
