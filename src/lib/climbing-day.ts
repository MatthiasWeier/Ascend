import { prisma } from "@/lib/prisma";
import { germanDateKey } from "@/lib/german-time";
import { notifyUsers } from "@/lib/notify";

// The grades the quick "Climbing day" dialog offers (plain Fontainebleau-style
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

// Mirrors a user's climbing day into the feed of every group where they
// share their training (auto-share on): one CLIMBING post per group and day,
// updated in place when the day is edited and removed when it is cleared.
// Only a newly created post notifies the group.
export async function shareClimbingDay(userId: string, dateKey: string): Promise<void> {
  const sends = await getSendsOnDay(userId, dateKey);
  const boulder: Record<string, number> = {};
  let routes = 0;
  for (const s of sends) {
    if (s.style === "BOULDER") boulder[s.grade] = (boulder[s.grade] ?? 0) + s.count;
    else routes += s.count;
  }
  const total = Object.values(boulder).reduce((a, b) => a + b, 0) + routes;

  if (total === 0) {
    await prisma.groupPost.deleteMany({ where: { userId, type: "CLIMBING", climbingDate: dateKey } });
    return;
  }

  const [memberships, actor] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId, autoShareWorkouts: true },
      select: {
        groupId: true,
        group: { select: { name: true, members: { where: { userId: { not: userId } }, select: { userId: true } } } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  const name = actor?.name ?? "Jemand";
  const content = JSON.stringify({ boulder, routes });

  for (const m of memberships) {
    const where = { groupId_userId_climbingDate: { groupId: m.groupId, userId, climbingDate: dateKey } };
    const existing = await prisma.groupPost.findUnique({ where, select: { id: true } });
    if (existing) {
      await prisma.groupPost.update({ where, data: { content } });
      continue;
    }
    const post = await prisma.groupPost.create({
      data: { groupId: m.groupId, userId, type: "CLIMBING", content, climbingDate: dateKey },
      select: { id: true },
    });
    notifyUsers(m.group.members.map((mem) => mem.userId), {
      type: "CLIMBING",
      actorId: userId,
      actorName: name,
      groupName: m.group.name,
      snippet: String(total),
      url: `/dashboard/groups/${m.groupId}?tab=feed&post=${post.id}`,
      pushTitle: m.group.name,
      pushBody: `${name} war klettern (${total} Sends) 🧗`,
    }).catch(() => {});
  }
}
