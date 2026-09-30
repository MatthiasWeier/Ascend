import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";

const DAYS = 30;

export async function GET(
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

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });
  const memberIds = members.map((m) => m.userId);

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: { in: memberIds }, date: { gte: since } },
    select: { userId: true, date: true, sets: { select: { id: true } } },
  });

  // Volume by day: total sets logged by anyone in the group, bucketed by
  // German calendar day so "today" lines up with the rest of the app.
  const setsByDay = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    setsByDay.set(germanDateKey(d), 0);
  }
  for (const s of sessions) {
    const key = germanDateKey(s.date);
    if (setsByDay.has(key)) {
      setsByDay.set(key, (setsByDay.get(key) ?? 0) + s.sets.length);
    }
  }
  const volumeByDay = Array.from(setsByDay.entries()).map(([date, totalSets]) => ({ date, totalSets }));

  // Workouts logged per member in the same window.
  const countByUser = new Map<string, number>();
  for (const s of sessions) {
    countByUser.set(s.userId, (countByUser.get(s.userId) ?? 0) + 1);
  }
  const memberActivity = members
    .map((m) => ({
      userId: m.userId,
      userName: m.user.name,
      workoutCount: countByUser.get(m.userId) ?? 0,
    }))
    .sort((a, b) => b.workoutCount - a.workoutCount);

  // Climbing days as a group: every past CLIMBING-activity meetup in this
  // group, not just the last DAYS days - these are sparse (weekly/monthly
  // at most) and asking "how often overall" is the actual question, not a
  // recent trend. "Attendance" = RSVP'd via ClimbingMeetupParticipant -
  // there's no separate check-in, so a confirmed join is what "was there"
  // means here, same as everywhere else this app treats a join as going.
  const pastClimbingMeetups = await prisma.climbingMeetup.findMany({
    where: { groupId, activity: "CLIMBING", dateKey: { lte: todayGermanDateKey() } },
    select: { dateKey: true, time: true, location: true, participants: { select: { userId: true } } },
    orderBy: { dateKey: "desc" },
  });

  const climbingCountByUser = new Map<string, number>();
  for (const meetup of pastClimbingMeetups) {
    for (const p of meetup.participants) {
      climbingCountByUser.set(p.userId, (climbingCountByUser.get(p.userId) ?? 0) + 1);
    }
  }
  const climbingAttendance = members
    .map((m) => ({
      userId: m.userId,
      userName: m.user.name,
      count: climbingCountByUser.get(m.userId) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const climbing = {
    totalCount: pastClimbingMeetups.length,
    recentDates: pastClimbingMeetups.slice(0, 20).map((m) => ({
      dateKey: m.dateKey,
      time: m.time,
      location: m.location,
      participantCount: m.participants.length,
    })),
    attendance: climbingAttendance,
  };

  return NextResponse.json({ days: DAYS, today: todayGermanDateKey(), volumeByDay, memberActivity, climbing });
}
