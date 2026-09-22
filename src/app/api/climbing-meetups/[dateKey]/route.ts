import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";

export const dynamic = "force-dynamic";

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

// Every meetup on this day across the user's groups (usually 0-2) - the
// personal calendar's day-detail view.
export async function GET(_request: Request, { params }: { params: Promise<{ dateKey: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dateKey } = await params;
  if (!DATE_KEY_RE.test(dateKey)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId: session.user.id }, select: { groupId: true } })
  ).map((m) => m.groupId);

  const meetups = myGroupIds.length
    ? await prisma.climbingMeetup.findMany({
        where: { groupId: { in: myGroupIds }, dateKey },
        include: {
          group: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          participants: participantSelect,
          suggestions: suggestionSelect,
        },
      })
    : [];

  return NextResponse.json({ meetups });
}
