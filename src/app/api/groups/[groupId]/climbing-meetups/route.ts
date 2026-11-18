import { NextResponse } from "next/server";
import { z } from "zod";
import type { ClimbingFocus, MeetupActivity } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { notifyUsers } from "@/lib/notify";
import { todayGermanDateKey } from "@/lib/german-time";
import { ALL_MEETUP_FOCUSES, MEETUP_ACTIVITIES, meetupDisplayName, DATE_KEY_RE, TIME_RE } from "@/lib/climbing-meetups";

const createSchema = z.object({
  activity: z.enum(MEETUP_ACTIVITIES as [string, ...string[]]).default("CLIMBING"),
  title: z.string().max(60).optional(),
  dateKey: z.string().regex(DATE_KEY_RE),
  time: z.string().regex(TIME_RE).optional(),
  location: z.string().max(120).optional(),
  goal: z.string().max(200).optional(),
  focuses: z.array(z.enum(ALL_MEETUP_FOCUSES as [string, ...string[]])).max(ALL_MEETUP_FOCUSES.length).optional(),
});

const participantSelect = {
  select: {
    userId: true,
    goal: true,
    focuses: true,
    remindedAt: true,
    user: { select: { id: true, name: true, avatarUrl: true } },
  },
} as const;

const suggestionSelect = {
  select: {
    id: true,
    dateKey: true,
    time: true,
    location: true,
    note: true,
    status: true,
    createdAt: true,
    suggestedBy: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "desc" as const },
};

export const meetupInclude = {
  createdBy: { select: { id: true, name: true } },
  participants: participantSelect,
  suggestions: suggestionSelect,
};

// Upcoming (today or later) planned training days for this group - any
// activity (climbing, gym, whatever).
export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const meetups = await prisma.climbingMeetup.findMany({
    where: { groupId, dateKey: { gte: todayGermanDateKey() } },
    orderBy: { dateKey: "asc" },
    include: meetupInclude,
  });

  return NextResponse.json({ meetups });
}

// Several can share a day (a gym session and a climbing session the same
// evening, say), so this never blocks on an existing one.
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.dateKey < todayGermanDateKey()) {
    return NextResponse.json({ error: "Events can only be planned for today or later" }, { status: 400 });
  }

  const { activity, title, dateKey, time, location, goal, focuses } = parsed.data;
  const meetup = await prisma.climbingMeetup.create({
    data: {
      groupId,
      createdById: session.user.id,
      activity: activity as MeetupActivity,
      title: title || null,
      dateKey,
      time: time || null,
      location: location || null,
      participants: { create: { userId: session.user.id, goal: goal || null, focuses: (focuses ?? []) as ClimbingFocus[] } },
    },
    include: meetupInclude,
  });

  const [otherMembers, group, actor] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId, userId: { not: session.user.id } }, select: { userId: true } }),
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (otherMembers.length > 0) {
    const name = actor?.name ?? "Jemand";
    const activityName = meetupDisplayName(meetup.activity, meetup.title);
    notifyUsers(
      otherMembers.map((m) => m.userId),
      {
        type: "CLIMBING_INVITE",
        actorId: session.user.id,
        actorName: name,
        groupName: group?.name ?? "",
        snippet: `${activityName}|${dateKey}`,
        url: `/dashboard/groups/${groupId}?tab=climbing`,
        pushTitle: group?.name ?? "Ascend",
        pushBody: `${name} plant "${activityName}" am ${dateKey} - wer kommt mit?`,
      }
    ).catch(() => {});
  }

  return NextResponse.json({ meetup }, { status: 201 });
}
