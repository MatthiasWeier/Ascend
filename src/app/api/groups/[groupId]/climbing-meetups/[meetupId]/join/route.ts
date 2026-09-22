import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { ALL_MEETUP_FOCUSES } from "@/lib/climbing-meetups";
import type { ClimbingFocus } from "@prisma/client";

const joinSchema = z.object({
  goal: z.string().max(200).optional(),
  focuses: z.array(z.enum(ALL_MEETUP_FOCUSES as [string, ...string[]])).max(ALL_MEETUP_FOCUSES.length).optional(),
});

async function loadMeetup(groupId: string, meetupId: string) {
  const meetup = await prisma.climbingMeetup.findUnique({ where: { id: meetupId } });
  return meetup && meetup.groupId === groupId ? meetup : null;
}

// Join (or update your own goal/focuses if already joined) - everything
// past the RSVP itself is optional.
export async function POST(
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
  if (!(await loadMeetup(groupId, meetupId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = joinSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = {
    goal: parsed.data.goal || null,
    focuses: (parsed.data.focuses ?? []) as ClimbingFocus[],
  };

  const participant = await prisma.climbingMeetupParticipant.upsert({
    where: { meetupId_userId: { meetupId, userId: session.user.id } },
    create: { meetupId, userId: session.user.id, ...data },
    // Re-joining (or editing goal/focus) is a fresh RSVP - if the lead-time
    // reminder already fired once, let it fire again on genuinely new info
    // rather than staying silent forever.
    update: { ...data, remindedAt: null },
  });
  return NextResponse.json({ participant }, { status: 201 });
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
  if (!(await loadMeetup(groupId, meetupId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.climbingMeetupParticipant.deleteMany({ where: { meetupId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
