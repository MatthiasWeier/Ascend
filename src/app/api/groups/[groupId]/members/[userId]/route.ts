import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// Same endpoint covers both self-service "leave the group" (any non-leader
// member removing themselves) and the leader kicking someone else - the
// permission check just branches on which one this is.
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
  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  if (userId === session.user.id) {
    if (myMembership.role === "LEADER") {
      return NextResponse.json(
        { error: "Als Leader musst du die Leitung erst übergeben, bevor du die Gruppe verlassen kannst" },
        { status: 400 }
      );
    }
    await prisma.groupMember.delete({ where: { id: myMembership.id } });
    return NextResponse.json({ ok: true });
  }

  if (myMembership.role !== "LEADER") {
    return NextResponse.json({ error: "Nur der Leader darf Mitglieder entfernen" }, { status: 403 });
  }

  const target = await getGroupMembership(userId, groupId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupMember.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}
