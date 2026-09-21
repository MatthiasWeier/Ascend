import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The custom exercises this user may edit or delete: their own, plus group
// exercises of groups they lead.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const ledGroupIds = (
    await prisma.groupMember.findMany({ where: { userId, role: "LEADER" }, select: { groupId: true } })
  ).map((m) => m.groupId);

  const exercises = await prisma.exercise.findMany({
    where: {
      isDefault: false,
      OR: [{ createdById: userId }, ...(ledGroupIds.length > 0 ? [{ groupId: { in: ledGroupIds } }] : [])],
    },
    orderBy: { name: "asc" },
    include: {
      muscles: { select: { muscle: true, role: true } },
      group: { select: { name: true } },
      _count: { select: { sets: true } },
    },
  });

  return NextResponse.json({
    exercises: exercises.map(({ _count, group, ...e }) => ({
      ...e,
      groupName: group?.name ?? null,
      setCount: _count.sets,
    })),
  });
}
