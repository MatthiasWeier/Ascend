import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { DATE_KEY_RE, TIME_RE } from "@/lib/climbing-meetups";
import { todayGermanDateKey } from "@/lib/german-time";

const editSchema = z.object({
  dateKey: z.string().regex(DATE_KEY_RE).optional(),
  time: z.string().regex(TIME_RE).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  title: z.string().max(60).nullable().optional(),
});

async function loadMeetup(groupId: string, meetupId: string) {
  const meetup = await prisma.climbingMeetup.findUnique({ where: { id: meetupId } });
  return meetup && meetup.groupId === groupId ? meetup : null;
}

// Only the creator can reschedule/relocate or cancel - same reasoning as
// group goals/daily challenges: whoever planned it owns it, the leader
// doesn't automatically inherit other members' plans. (Other members
// propose changes instead - see suggestions/.)
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
    return NextResponse.json({ error: "Only whoever planned the event can change it" }, { status: 403 });
  }
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.dateKey && parsed.data.dateKey < todayGermanDateKey()) {
    return NextResponse.json({ error: "Events can only be planned for today or later" }, { status: 400 });
  }
  const data: { dateKey?: string; time?: string | null; location?: string | null; title?: string | null } = {};
  if (parsed.data.dateKey !== undefined) data.dateKey = parsed.data.dateKey;
  if (parsed.data.time !== undefined) data.time = parsed.data.time || null;
  if (parsed.data.location !== undefined) data.location = parsed.data.location || null;
  if (parsed.data.title !== undefined) data.title = parsed.data.title || null;

  // The plan changed - clear reminded-flags so anyone already reminded for
  // the old time/date gets reminded again for the new one.
  const [updated] = await prisma.$transaction([
    prisma.climbingMeetup.update({ where: { id: meetupId }, data }),
    prisma.climbingMeetupParticipant.updateMany({ where: { meetupId }, data: { remindedAt: null } }),
  ]);
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
    return NextResponse.json({ error: "Nur wer den Termin geplant hat, kann ihn absagen" }, { status: 403 });
  }
  await prisma.climbingMeetup.delete({ where: { id: meetupId } });
  return NextResponse.json({ ok: true });
}
