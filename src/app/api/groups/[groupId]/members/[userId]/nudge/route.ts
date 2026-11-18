import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notify";

// Any member can nudge any other member in a shared group - rate-limited
// per (from, to) pair so it stays a friendly poke, not spam.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "You can't nudge yourself" }, { status: 400 });
  }

  const [myMembership, targetMembership] = await Promise.all([
    getGroupMembership(session.user.id, groupId),
    getGroupMembership(userId, groupId),
  ]);
  if (!myMembership || !targetMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { allowed, retryAfterSec } = await checkRateLimit(`nudge:${session.user.id}:${userId}`, 1, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Schon angestupst - versuch's in ${Math.ceil(retryAfterSec / 60)} Min. nochmal.` },
      { status: 429 }
    );
  }

  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });

  await notifyUsers([userId], {
    type: "NUDGE",
    actorId: session.user.id,
    actorName: actor?.name ?? "Jemand",
    groupName: group?.name ?? "",
    url: "/dashboard/workouts/new",
    pushTitle: group?.name ?? "Ascend",
    pushBody: `${actor?.name ?? "Jemand"} hat dich angestupst - zieh dein Workout durch!`,
  });

  return NextResponse.json({ ok: true });
}
