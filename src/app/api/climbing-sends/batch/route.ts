import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BOULDER_DAY_GRADES, DATE_KEY_RE, getSendsOnDay, shareClimbingDay } from "@/lib/climbing-day";

const batchSchema = z.object({
  date: z.string().regex(DATE_KEY_RE), // YYYY-MM-DD (German calendar day being logged)
  style: z.enum(["BOULDER", "ROUTE"]),
  // Empty = clear the day's quick-dialog entries.
  entries: z.array(z.object({ grade: z.string().min(1).max(20), count: z.number().int().positive().max(500) })).max(100),
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

  // Show the day in the feed of the groups where this user shares training.
  await shareClimbingDay(userId, dateKey);

  return NextResponse.json({ sends }, { status: 201 });
}
