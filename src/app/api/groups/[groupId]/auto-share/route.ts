import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { shareAllUnsharedWorkouts } from "@/lib/workout-sharing";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    data: { autoShareWorkouts: parsed.data.enabled },
  });

  // Turning it on backfills everything not already shared here; turning it
  // off only stops future workouts from being shared - it never un-shares
  // what's already in the feed.
  const sharedCount = parsed.data.enabled
    ? await shareAllUnsharedWorkouts(session.user.id, groupId)
    : 0;

  return NextResponse.json({ enabled: parsed.data.enabled, sharedCount });
}
