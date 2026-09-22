import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Which days this month have a planned climbing day in any group the user
// is a member of - merged personal view across groups, same idea as
// /api/climbing-sends but for future meetups instead of past sends.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1); // 1-12

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toMonth = month === 12 ? 1 : month + 1;
  const toYear = month === 12 ? year + 1 : year;
  const to = `${toYear}-${String(toMonth).padStart(2, "0")}-01`;

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId: session.user.id }, select: { groupId: true } })
  ).map((m) => m.groupId);
  if (myGroupIds.length === 0) return NextResponse.json({ markedDays: [] });

  const meetups = await prisma.climbingMeetup.findMany({
    where: { groupId: { in: myGroupIds }, dateKey: { gte: from, lt: to } },
    select: { dateKey: true },
  });

  return NextResponse.json({ markedDays: Array.from(new Set(meetups.map((m) => m.dateKey))) });
}
