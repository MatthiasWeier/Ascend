import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIME_RE } from "@/lib/climbing-meetups";

const editSchema = z.object({
  weekday: z.number().int().min(0).max(6).optional(),
  time: z.string().regex(TIME_RE).optional(),
  label: z.string().max(60).nullable().optional(),
  enabled: z.boolean().optional(),
});

async function loadOwn(reminderId: string, userId: string) {
  const reminder = await prisma.workoutReminder.findUnique({ where: { id: reminderId } });
  return reminder && reminder.userId === userId ? reminder : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ reminderId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { reminderId } = await params;
  if (!(await loadOwn(reminderId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data: { weekday?: number; time?: string; label?: string | null; enabled?: boolean; lastFiredDateKey?: null } = {};
  if (parsed.data.weekday !== undefined) data.weekday = parsed.data.weekday;
  if (parsed.data.time !== undefined) data.time = parsed.data.time;
  if (parsed.data.label !== undefined) data.label = parsed.data.label || null;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  // Changing the day/time makes the old "already fired today" guard stale.
  if (parsed.data.weekday !== undefined || parsed.data.time !== undefined) data.lastFiredDateKey = null;

  const updated = await prisma.workoutReminder.update({ where: { id: reminderId }, data });
  return NextResponse.json({ reminder: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ reminderId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { reminderId } = await params;
  if (!(await loadOwn(reminderId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.workoutReminder.delete({ where: { id: reminderId } });
  return NextResponse.json({ ok: true });
}
