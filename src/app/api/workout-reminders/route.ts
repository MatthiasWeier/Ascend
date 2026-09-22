import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIME_RE } from "@/lib/climbing-meetups";

export const dynamic = "force-dynamic";

const MAX_REMINDERS = 14;

const createSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(TIME_RE),
  label: z.string().max(60).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reminders = await prisma.workoutReminder.findMany({
    where: { userId: session.user.id },
    orderBy: [{ weekday: "asc" }, { time: "asc" }],
  });
  return NextResponse.json({ reminders });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const count = await prisma.workoutReminder.count({ where: { userId: session.user.id } });
  if (count >= MAX_REMINDERS) {
    return NextResponse.json({ error: "Zu viele Erinnerungen" }, { status: 400 });
  }
  const reminder = await prisma.workoutReminder.create({
    data: { userId: session.user.id, weekday: parsed.data.weekday, time: parsed.data.time, label: parsed.data.label || null },
  });
  return NextResponse.json({ reminder }, { status: 201 });
}
