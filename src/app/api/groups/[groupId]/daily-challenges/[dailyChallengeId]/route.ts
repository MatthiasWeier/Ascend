import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; dailyChallengeId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, dailyChallengeId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Only the leader can deactivate challenges" }, { status: 403 });
  }

  const dc = await prisma.groupDailyChallenge.findUnique({ where: { id: dailyChallengeId } });
  if (!dc || dc.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupDailyChallenge.update({ where: { id: dailyChallengeId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
