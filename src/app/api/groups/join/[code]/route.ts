import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code } = await params;

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) {
    return NextResponse.json({ error: "Invite link is invalid" }, { status: 404 });
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    create: { groupId: group.id, userId: session.user.id, role: "MEMBER" },
    update: {},
  });

  return NextResponse.json({ groupId: group.id, groupName: group.name });
}
