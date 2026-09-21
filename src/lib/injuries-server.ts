import { prisma } from "@/lib/prisma";

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
