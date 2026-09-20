import { prisma } from "@/lib/prisma";
import { germanDateKey } from "@/lib/german-time";

// The grades the quick "Klettertag" dialog offers (plain Fontainebleau-style
// numbers). Sends with other grades - V-scale, routes, "6a+" - are logged via
// the single-send dialog and are never touched by the day dialog.
export const BOULDER_DAY_GRADES = ["1", "2", "3", "4", "5", "6", "7", "8"];

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_MS = 24 * 60 * 60 * 1000;

// All of a user's sends on one Europe/Berlin calendar day. Rows are fetched
// with a generous UTC window and then filtered by their Berlin day key.
export async function getSendsOnDay(userId: string, dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00.000Z`);
  const sends = await prisma.climbingSend.findMany({
    where: { userId, date: { gte: new Date(day.getTime() - DAY_MS), lt: new Date(day.getTime() + 2 * DAY_MS) } },
    select: { id: true, style: true, grade: true, count: true, date: true },
  });
  return sends.filter((s) => germanDateKey(s.date) === dateKey);
}
