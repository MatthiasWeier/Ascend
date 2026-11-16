import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { todayGermanDateKey, addDaysToDateKey } from "@/lib/german-time";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";

// Combined activity calendar for external automations: own logged workouts
// plus group meetups (climbing/gym/other) in one call. The ICS feed under
// /api/calendar/[token] only covers workouts and needs no API key (it's
// authenticated by the URL token instead) - this also needs meetups, so
// it's a separate JSON endpoint rather than extending that one.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const today = todayGermanDateKey();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam && DATE_KEY_RE.test(fromParam) ? fromParam : addDaysToDateKey(today, -7);
  const to = toParam && DATE_KEY_RE.test(toParam) ? toParam : addDaysToDateKey(today, 30);

  const [sessions, memberships] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId: auth.userId,
        date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) },
      },
      orderBy: { date: "desc" },
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    prisma.groupMember.findMany({ where: { userId: auth.userId }, select: { groupId: true } }),
  ]);

  const myGroupIds = memberships.map((m) => m.groupId);
  const meetups =
    myGroupIds.length === 0
      ? []
      : await prisma.climbingMeetup.findMany({
          where: { groupId: { in: myGroupIds }, dateKey: { gte: from, lte: to } },
          orderBy: { dateKey: "asc" },
          include: {
            group: { select: { name: true } },
            participants: { select: { userId: true } },
          },
        });

  return NextResponse.json({
    from,
    to,
    workouts: sessions.map((s) => ({
      id: s.id,
      date: s.date,
      summary: summarizeWorkoutSession(s).split("\n")[0],
    })),
    meetups: meetups.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      groupName: m.group.name,
      activity: m.activity,
      title: m.title,
      dateKey: m.dateKey,
      time: m.time,
      location: m.location,
      participantCount: m.participants.length,
      joined: m.participants.some((p) => p.userId === auth.userId),
    })),
  });
}
