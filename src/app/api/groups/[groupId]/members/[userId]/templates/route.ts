import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// A group member's templates, visible to any other member of the same
// group so a routine can be browsed before copying it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId } = await params;

  const [callerMembership, targetMembership] = await Promise.all([
    getGroupMembership(session.user.id, groupId),
    getGroupMembership(userId, groupId),
  ]);
  if (!callerMembership || !targetMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const templates = await prisma.workoutTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { entries: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ templates });
}
