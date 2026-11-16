import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { meetupDisplayName } from "@/lib/climbing-meetups";

// RFC 5545 §3.3.11 text escaping.
function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// No login required - authenticated by the token in the URL instead, like
// any subscribable private calendar feed (Google Calendar, GitHub, etc.).
// Not authenticated by session because calendar apps poll this URL on
// their own schedule, with no browser session to send.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, "");

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [sessions, memberships] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } }),
  ]);

  const groupIds = memberships.map((m) => m.groupId);
  // Every meetup (Klettern/Gym/Sonstiges) in a group this user belongs to,
  // not just ones they joined - same as the in-app meetup list, join
  // status is just a label on top, not a filter.
  const meetups =
    groupIds.length === 0
      ? []
      : await prisma.climbingMeetup.findMany({
          where: { groupId: { in: groupIds } },
          orderBy: { dateKey: "asc" },
          include: {
            group: { select: { name: true } },
            participants: { select: { userId: true } },
          },
        });

  const now = toIcsDate(new Date());

  const workoutEvents = sessions.map((s) => {
    const summary = summarizeWorkoutSession(s);
    const firstLine = summary.split("\n")[0];
    return [
      "BEGIN:VEVENT",
      `UID:ascend-workout-${s.id}@ascend`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(s.date)}`,
      `SUMMARY:${escapeIcsText(firstLine)}`,
      `DESCRIPTION:${escapeIcsText(summary)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  // Timed meetups use Europe/Berlin wall-clock numbers directly (no
  // embedded VTIMEZONE block, but every mainstream calendar client
  // resolves the IANA name fine without one); untimed ones are an
  // all-day marker on that day instead.
  const meetupEvents = meetups.map((m) => {
    const title = meetupDisplayName(m.activity, m.title);
    const joined = m.participants.some((p) => p.userId === user.id);
    const summary = joined ? title : `${title} (nicht zugesagt)`;
    const descriptionParts = [
      m.location ? `Ort: ${m.location}` : null,
      `Zusagen: ${m.participants.length}`,
    ].filter((part): part is string => part != null);
    const dateKeyCompact = m.dateKey.replace(/-/g, "");
    const dtstartLine = m.time
      ? `DTSTART;TZID=Europe/Berlin:${dateKeyCompact}T${m.time.replace(":", "")}00`
      : `DTSTART;VALUE=DATE:${dateKeyCompact}`;
    return [
      "BEGIN:VEVENT",
      `UID:ascend-meetup-${m.id}@ascend`,
      `DTSTAMP:${now}`,
      dtstartLine,
      `SUMMARY:${escapeIcsText(`${m.group.name}: ${summary}`)}`,
      ...(descriptionParts.length > 0 ? [`DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`] : []),
      "END:VEVENT",
    ].join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ascend//Workout Calendar//DE",
    `X-WR-CALNAME:${escapeIcsText(`${user.name} - Ascend`)}`,
    "CALSCALE:GREGORIAN",
    ...workoutEvents,
    ...meetupEvents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ascend-workouts.ics"',
    },
  });
}
