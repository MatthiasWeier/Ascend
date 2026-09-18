import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId: auth.userId }, select: { groupId: true } })
  ).map((m) => m.groupId);

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdById: auth.userId },
        ...(myGroupIds.length > 0 ? [{ groupId: { in: myGroupIds } }] : []),
      ],
    },
    select: { id: true, name: true, type: true, focus: true, isBodyweight: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ exercises });
}
