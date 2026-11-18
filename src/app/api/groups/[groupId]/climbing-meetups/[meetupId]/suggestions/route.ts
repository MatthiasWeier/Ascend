import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { notifyUsers } from "@/lib/notify";
import { DATE_KEY_RE, TIME_RE, meetupDisplayName } from "@/lib/climbing-meetups";
import { todayGermanDateKey } from "@/lib/german-time";

const suggestSchema = z
  .object({
    dateKey: z.string().regex(DATE_KEY_RE).optional(),
    time: z.string().regex(TIME_RE).optional(),
    location: z.string().max(120).optional(),
    note: z.string().max(200).optional(),
  })
  .refine((d) => d.dateKey || d.time || d.location || d.note, "At least one suggested change is required");

// Any group member proposes a change to a planned meetup - the creator
// then accepts (applies it) or declines. Never lets you suggest changing
// your own meetup - just edit it directly instead.
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
  const meetup = await prisma.climbingMeetup.findUnique({ where: { id: meetupId } });
  if (!meetup || meetup.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (meetup.createdById === session.user.id) {
    return NextResponse.json({ error: "Du kannst deinen eigenen Termin direkt bearbeiten" }, { status: 400 });
  }
  const parsed = suggestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  if (parsed.data.dateKey && parsed.data.dateKey < todayGermanDateKey()) {
    return NextResponse.json({ error: "Events can only be planned for today or later" }, { status: 400 });
  }

  const suggestion = await prisma.climbingMeetupSuggestion.create({
    data: { meetupId, suggestedById: session.user.id, ...parsed.data },
    include: { suggestedBy: { select: { id: true, name: true } } },
  });

  const [group, actor] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  const name = actor?.name ?? "Jemand";
  const activityName = meetupDisplayName(meetup.activity, meetup.title);
  notifyUsers([meetup.createdById], {
    type: "CLIMBING_INVITE",
    actorId: session.user.id,
    actorName: name,
    groupName: group?.name ?? "",
    snippet: `${activityName}|${meetup.dateKey}`,
    url: `/dashboard/groups/${groupId}?tab=climbing`,
    pushTitle: group?.name ?? "Ascend",
    pushBody: `${name} is suggesting a change for "${activityName}"`,
  }).catch(() => {});

  return NextResponse.json({ suggestion }, { status: 201 });
}
