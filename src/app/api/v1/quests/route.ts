import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { questInclude } from "@/lib/quests";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quests = await prisma.quest.findMany({
    where: { userId: auth.userId },
    include: questInclude,
  });
  // Active first (soonest deadline on top), then finished ones, newest first -
  // same ordering as GET /api/quests.
  quests.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
    if (a.status === "ACTIVE") return a.targetDateKey.localeCompare(b.targetDateKey);
    return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
  });

  return NextResponse.json({ quests });
}
