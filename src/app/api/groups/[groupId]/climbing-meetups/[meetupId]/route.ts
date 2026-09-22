import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

const editSchema = z.object({
  time: z.string().max(20).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
});

async function loadMeetup(groupId: string, meetupId: string) {
  const meetup = await prisma.climbingMeetup.findUnique({ where: { id: meetupId } });
  return meetup && meetup.groupId === groupId ? meetup : null;
}

// Only the creator can reschedule/relocate or cancel - same reasoning as
// group goals/daily challenges: whoever planned it owns it, the leader
// doesn't automatically inherit other members' plans.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; meetupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, meetupId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const meetup = await loadMeetup(groupId, meetupId);
  if (!meetup) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meetup.createdById !== session.user.id) {
    return NextResponse.json({ error: "Nur wer den Klettertag geplant hat, kann ihn ändern" }, { status: 403 });
  }
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data: { time?: string | null; location?: string | null } = {};
  if (parsed.data.time !== undefined) data.time = parsed.data.time || null;
  if (parsed.data.location !== undefined) data.location = parsed.data.location || null;

  const updated = await prisma.climbingMeetup.update({ where: { id: meetupId }, data });
  return NextResponse.json({ meetup: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; meetupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, meetupId } = await params;
  const meetup = await loadMeetup(groupId, meetupId);
  if (!meetup) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meetup.createdById !== session.user.id) {
    return NextResponse.json({ error: "Nur wer den Klettertag geplant hat, kann ihn absagen" }, { status: 403 });
  }
  await prisma.climbingMeetup.delete({ where: { id: meetupId } });
  return NextResponse.json({ ok: true });
}
