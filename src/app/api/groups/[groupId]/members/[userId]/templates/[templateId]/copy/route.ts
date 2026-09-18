import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

// Copies another group member's template into the caller's own library.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string; templateId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId, templateId } = await params;

  const [callerMembership, targetMembership] = await Promise.all([
    getGroupMembership(session.user.id, groupId),
    getGroupMembership(userId, groupId),
  ]);
  if (!callerMembership || !targetMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const source = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  if (!source || source.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const copy = await prisma.workoutTemplate.create({
    data: {
      userId: session.user.id,
      name: source.name,
      entries: {
        create: source.entries.map((e) => ({
          exerciseId: e.exerciseId,
          order: e.order,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
        })),
      },
    },
    include: { entries: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ template: copy }, { status: 201 });
}
