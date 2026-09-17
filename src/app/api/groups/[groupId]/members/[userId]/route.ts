import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId } = await params;

  const myMembership = await getGroupMembership(session.user.id, groupId);
  if (!myMembership || myMembership.role !== "LEADER") {
    return NextResponse.json({ error: "Nur der Leader darf Mitglieder entfernen" }, { status: 403 });
  }
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Du kannst dich nicht selbst entfernen" }, { status: 400 });
  }

  const target = await getGroupMembership(userId, groupId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupMember.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}
