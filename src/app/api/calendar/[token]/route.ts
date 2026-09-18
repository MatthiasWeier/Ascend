import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeWorkoutSession } from "@/lib/workout-summary";

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

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  const now = toIcsDate(new Date());
  const events = sessions.map((s) => {
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

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ascend//Workout Calendar//DE",
    `X-WR-CALNAME:${escapeIcsText(`${user.name} - Ascend Workouts`)}`,
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ascend-workouts.ics"',
    },
  });
}
