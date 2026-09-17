import { prisma } from "@/lib/prisma";
import { germanDateKey } from "@/lib/german-time";

// Bodyweight at a point in time: the closest logged entry at-or-before that
// day, falling back to the closest entry after it, falling back to the
// user's cached "current" weight. Getting heavier over time means old
// bodyweight-exercise sets are still scored against the *old* (lighter)
// bodyweight - so a gained-weight user doesn't retroactively look stronger.
export async function getBodyWeightAt(userId: string, at: Date): Promise<number | null> {
  const dateKey = germanDateKey(at);

  const before = await prisma.bodyWeightEntry.findFirst({
    where: { userId, dateKey: { lte: dateKey } },
    orderBy: { dateKey: "desc" },
  });
  if (before) return before.weightKg;

  const after = await prisma.bodyWeightEntry.findFirst({
    where: { userId, dateKey: { gt: dateKey } },
    orderBy: { dateKey: "asc" },
  });
  if (after) return after.weightKg;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bodyWeightKg: true } });
  return user?.bodyWeightKg ?? null;
}

// Batch version: fetches all of a user's bodyweight history once and resolves
// many dates against it in memory - avoids N queries in analytics endpoints
// that loop over many workout sessions.
export async function makeBodyWeightResolver(userId: string) {
  const [entries, user] = await Promise.all([
    prisma.bodyWeightEntry.findMany({ where: { userId }, orderBy: { dateKey: "asc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { bodyWeightKg: true } }),
  ]);
  const fallback = user?.bodyWeightKg ?? null;

  return (at: Date): number | null => {
    const dateKey = germanDateKey(at);
    let resolved: number | null = null;
    for (const entry of entries) {
      if (entry.dateKey <= dateKey) {
        resolved = entry.weightKg;
      } else {
        break;
      }
    }
    if (resolved != null) return resolved;
    // No entry at-or-before: use the earliest known entry if any, else fallback.
    return entries[0]?.weightKg ?? fallback;
  };
}

// Effective load for a set: bodyweight (if applicable) + any added weight.
export function effectiveLoadKg(isBodyweight: boolean, bodyWeightKg: number | null, addedWeightKg: number | null) {
  const added = addedWeightKg ?? 0;
  if (!isBodyweight) return added;
  return (bodyWeightKg ?? 0) + added;
}
