import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { questInclude } from "@/lib/quests";

// Sidequests the group's members chose to share - a member's private
// quests never show up here, whichever groups they're in.
export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const quests = await prisma.quest.findMany({
    where: { sharedWithGroups: true, user: { groupMemberships: { some: { groupId } } } },
    include: { ...questInclude, user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  quests.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
    if (a.status === "ACTIVE") return a.targetDateKey.localeCompare(b.targetDateKey);
    return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
  });

  return NextResponse.json({ quests });
}
