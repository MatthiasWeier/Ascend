import { prisma } from "@/lib/prisma";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";

// Injuries that count right now: not marked healed and not past their end date.
export async function getActiveInjuries(userId: string) {
  return prisma.injury.findMany({
    where: {
      userId,
      resolvedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, bodyPart: true, severity: true, note: true, startedAt: true, endsAt: true },
  });
}

// Active injuries that still need today's "immer noch verletzt?" answer -
// never the day it was first reported, and never twice on the same day.
export async function getPendingInjuryCheckins(userId: string) {
  const today = todayGermanDateKey();
  const active = await prisma.injury.findMany({
    where: {
      userId,
      resolvedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    select: { id: true, bodyPart: true, severity: true, startedAt: true, checkins: { where: { dateKey: today }, select: { id: true } } },
  });
  return active
    .filter((i) => germanDateKey(i.startedAt) !== today && i.checkins.length === 0)
    .map(({ id, bodyPart, severity }) => ({ id, bodyPart, severity }));
}
