import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

const transferSchema = z.object({ userId: z.string() });

// Moves both the visible "Leader" role and the real Group.ownerId (the
// field that actually cascades on account deletion) to another member -
// without this, "transferring leadership" would just be cosmetic and the
// group would still vanish if the *old* leader ever deleted their account.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;

  const myMembership = await getGroupMembership(session.user.id, groupId);
  if (!myMembership || myMembership.role !== "LEADER") {
    return NextResponse.json({ error: "Only the leader can hand over leadership" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.userId === session.user.id) {
    return NextResponse.json({ error: "You are already the leader" }, { status: 400 });
  }

  const target = await getGroupMembership(parsed.data.userId, groupId);
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.groupMember.update({ where: { id: myMembership.id }, data: { role: "MEMBER" } }),
    prisma.groupMember.update({ where: { id: target.id }, data: { role: "LEADER" } }),
    prisma.group.update({ where: { id: groupId }, data: { ownerId: target.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
