import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { BOULDER_DAY_GRADES, DATE_KEY_RE, getSendsOnDay } from "@/lib/climbing-day";

const batchSchema = z.object({
  date: z.string().regex(DATE_KEY_RE), // YYYY-MM-DD (German calendar day being logged)
  style: z.enum(["BOULDER", "ROUTE"]),
  // Empty = clear the day's quick-dialog entries.
  entries: z.array(z.object({ grade: z.string().min(1).max(20), count: z.number().int().positive().max(500) })),
});

// Saves one day from the quick "Klettertag" dialog. The dialog always shows
// the full picture for that day, so this REPLACES the day's entries of that
// style (for the dialog's own grades) instead of piling new rows on top.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date: dateKey, style, entries } = parsed.data;

  const existing = await getSendsOnDay(userId, dateKey);
  const replaceIds = existing
    .filter((s) => s.style === style && BOULDER_DAY_GRADES.includes(s.grade))
    .map((s) => s.id);

  const date = new Date(dateKey);
  const [, sends] = await prisma.$transaction([
    prisma.climbingSend.deleteMany({ where: { id: { in: replaceIds }, userId } }),
    prisma.climbingSend.createManyAndReturn({
      data: entries.map((e) => ({ userId, style, grade: e.grade, count: e.count, date })),
    }),
  ]);

  // Tell the crew about a new climbing day (not about later edits of it) -
  // only in groups where the user opted into sharing their training.
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  if (existing.length === 0 && total > 0 && style === "BOULDER") {
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
    for (const m of memberships) {
      notifyUsers(m.group.members.map((mem) => mem.userId), {
        type: "CLIMBING",
        actorId: userId,
        actorName: name,
        groupName: m.group.name,
        snippet: String(total),
        url: `/dashboard/groups/${m.groupId}`,
        pushTitle: m.group.name,
        pushBody: `${name} war bouldern (${total} Boulder) 🧗`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ sends }, { status: 201 });
}
