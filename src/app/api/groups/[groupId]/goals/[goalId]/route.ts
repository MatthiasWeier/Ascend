import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, goalId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Nur der Leader darf Ziele löschen" }, { status: 403 });
  }

  const goal = await prisma.groupGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupGoal.delete({ where: { id: goalId } });
  return NextResponse.json({ ok: true });
}
