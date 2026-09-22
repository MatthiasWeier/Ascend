import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { logger } from "@/lib/logger";
import {
  todayGermanDateKey,
  germanWeekday,
  germanTime,
  wallClockAtOrAfter,
  subtractMinutesFromWallClock,
} from "@/lib/german-time";
import { meetupDisplayName } from "@/lib/climbing-meetups";

const CHECK_INTERVAL_MS = 60_000;
// Only look this far ahead - keeps the query cheap and means a meetup
// created for next month doesn't need to be considered on every tick.
const LOOKAHEAD_DAYS = 3;

let started = false;

// Personal recurring "time to train" reminders. Fires once per Berlin day
// once the target time has passed (>=, not an exact-minute match) - a
// missed tick (restart, slow query, GC pause) would otherwise skip the
// reminder for the whole day if we required hitting the exact minute.
// lastFiredDateKey guards against firing twice the same day.
async function checkWorkoutReminders() {
  const nowKey = todayGermanDateKey();
  const weekday = germanWeekday();
  const time = germanTime();

  // SQL's "column != value" never matches a NULL column (comparing against
  // NULL yields NULL, not true) - a plain `{ not: nowKey }` would silently
  // exclude every reminder that has never fired yet (lastFiredDateKey still
  // null), i.e. every brand-new reminder, forever. Spell out the null case.
  const due = await prisma.workoutReminder.findMany({
    where: {
      enabled: true,
      weekday,
      time: { lte: time },
      OR: [{ lastFiredDateKey: null }, { lastFiredDateKey: { not: nowKey } }],
    },
    select: { id: true, userId: true, label: true },
  });
  if (due.length === 0) return;

  for (const reminder of due) {
    // Claim it first (idempotent update) so a slow notify never causes a
    // second tick to double-send while this one is still in flight.
    const claimed = await prisma.workoutReminder.updateMany({
      where: { id: reminder.id, OR: [{ lastFiredDateKey: null }, { lastFiredDateKey: { not: nowKey } }] },
      data: { lastFiredDateKey: nowKey },
    });
    if (claimed.count === 0) continue;

    // actorId must never equal the recipient - notifyUsers filters the
    // actor out of the recipient list, and this is a self-reminder, not
    // something another user triggered. "system" can't be a real user id.
    await notifyUsers([reminder.userId], {
      type: "WORKOUT_REMINDER",
      actorId: "system",
      actorName: "",
      groupName: "",
      snippet: reminder.label ?? undefined,
      url: "/dashboard/workouts/new",
      pushTitle: "Zeit für dein Workout!",
      pushBody: reminder.label ? `${reminder.label} steht an.` : "Deine geplante Trainingszeit ist da.",
    }).catch((err) => logger.warn("workout reminder notify failed", { id: reminder.id, error: String(err) }));
  }
}

// Lead-time reminders for planned group meetups (climbing/gym/whatever) -
// one per participant, gated by their personal meetupReminderLeadTime.
async function checkMeetupReminders() {
  const nowKey = todayGermanDateKey();
  const nowTime = germanTime();
  const to = new Date(`${nowKey}T12:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + LOOKAHEAD_DAYS);
  const toKey = to.toISOString().slice(0, 10);

  const meetups = await prisma.climbingMeetup.findMany({
    where: { dateKey: { gte: nowKey, lte: toKey } },
    include: {
      group: { select: { name: true } },
      participants: {
        where: { remindedAt: null },
        include: { user: { select: { id: true, meetupReminderLeadTime: true } } },
      },
    },
  });

  for (const meetup of meetups) {
    if (meetup.participants.length === 0) continue;
    const activityName = meetupDisplayName(meetup.activity, meetup.title);

    for (const participant of meetup.participants) {
      const lead = participant.user.meetupReminderLeadTime;
      if (lead === "NEVER") continue;

      let target: { dateKey: string; time: string } | null = null;
      if (lead === "EVENING_BEFORE") {
        target = subtractMinutesFromWallClock(meetup.dateKey, "18:00", 24 * 60);
      } else if (lead === "MORNING_OF") {
        target = { dateKey: meetup.dateKey, time: "08:00" };
      } else if (lead === "ONE_HOUR_BEFORE") {
        target = meetup.time ? subtractMinutesFromWallClock(meetup.dateKey, meetup.time, 60) : { dateKey: meetup.dateKey, time: "08:00" };
      }
      if (!target || !wallClockAtOrAfter(nowKey, nowTime, target.dateKey, target.time)) continue;

      const claimed = await prisma.climbingMeetupParticipant.updateMany({
        where: { id: participant.id, remindedAt: null },
        data: { remindedAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const when = meetup.time ? `${meetup.dateKey} ${meetup.time}` : meetup.dateKey;
      await notifyUsers([participant.userId], {
        type: "MEETUP_REMINDER",
        actorId: "system",
        actorName: "",
        groupName: meetup.group.name,
        snippet: `${activityName}|${meetup.dateKey}`,
        url: `/dashboard/groups/${meetup.groupId}?tab=climbing`,
        pushTitle: meetup.group.name,
        pushBody: `Erinnerung: "${activityName}" am ${when}${meetup.location ? ` (${meetup.location})` : ""}`,
      }).catch((err) => logger.warn("meetup reminder notify failed", { id: participant.id, error: String(err) }));
    }
  }
}

async function tick() {
  try {
    await checkWorkoutReminders();
  } catch (err) {
    logger.warn("workout reminder check failed", { error: String(err) });
  }
  try {
    await checkMeetupReminders();
  } catch (err) {
    logger.warn("meetup reminder check failed", { error: String(err) });
  }
}

// Called once from instrumentation.ts when the server starts. There's no
// separate worker process for this app (single container, see
// DEPLOYMENT.md) - an in-process interval is the simplest thing that
// actually works for a self-hosted single-instance deployment.
export function startScheduler() {
  if (started) return;
  started = true;
  logger.info("Reminder scheduler started", { intervalMs: CHECK_INTERVAL_MS });
  setInterval(() => {
    tick().catch(() => {});
  }, CHECK_INTERVAL_MS);
}
