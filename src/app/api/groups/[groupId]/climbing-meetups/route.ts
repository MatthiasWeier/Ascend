import { NextResponse } from "next/server";
import { z } from "zod";
import type { ClimbingFocus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { notifyUsers } from "@/lib/notify";
import { todayGermanDateKey } from "@/lib/german-time";
import { CLIMBING_FOCUSES, DATE_KEY_RE } from "@/lib/climbing-meetups";

const createSchema = z.object({
  dateKey: z.string().regex(DATE_KEY_RE),
  time: z.string().max(20).optional(),
  location: z.string().max(120).optional(),
  goal: z.string().max(200).optional(),
  focuses: z.array(z.enum(CLIMBING_FOCUSES as [string, ...string[]])).max(CLIMBING_FOCUSES.length).optional(),
});

const participantSelect = {
  select: {
    userId: true,
    goal: true,
    focuses: true,
    user: { select: { id: true, name: true, avatarUrl: true } },
  },
} as const;

// Upcoming (today or later) planned climbing days for this group.
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
    include: { createdBy: { select: { id: true, name: true } }, participants: participantSelect },
  });

  return NextResponse.json({ meetups });
}

// One per group per day - a member planning a day already covered just
// joins the existing one instead (409 with its id).
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
    return NextResponse.json({ error: "Klettertage lassen sich nur für heute oder später planen" }, { status: 400 });
  }

  const existing = await prisma.climbingMeetup.findUnique({
    where: { groupId_dateKey: { groupId, dateKey: parsed.data.dateKey } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An diesem Tag ist schon ein Klettertag geplant", meetupId: existing.id }, { status: 409 });
  }

  const { dateKey, time, location, goal, focuses } = parsed.data;
  const meetup = await prisma.climbingMeetup.create({
    data: {
      groupId,
      createdById: session.user.id,
      dateKey,
      time: time || null,
      location: location || null,
      participants: { create: { userId: session.user.id, goal: goal || null, focuses: (focuses ?? []) as ClimbingFocus[] } },
    },
    include: { createdBy: { select: { id: true, name: true } }, participants: participantSelect },
  });

  const [otherMembers, group, actor] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId, userId: { not: session.user.id } }, select: { userId: true } }),
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (otherMembers.length > 0) {
    const name = actor?.name ?? "Jemand";
    notifyUsers(
      otherMembers.map((m) => m.userId),
      {
        type: "CLIMBING_INVITE",
        actorId: session.user.id,
        actorName: name,
        groupName: group?.name ?? "",
        snippet: dateKey,
        url: `/dashboard/groups/${groupId}?tab=climbing`,
        pushTitle: group?.name ?? "Ascend",
        pushBody: `${name} plant einen Klettertag am ${dateKey} - wer kommt mit?`,
      }
    ).catch(() => {});
  }

  return NextResponse.json({ meetup }, { status: 201 });
}
