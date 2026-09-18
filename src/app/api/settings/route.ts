import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";
import type { MuscleFocus } from "@prisma/client";

const settingsSchema = z.object({
  bodyWeightKg: z.number().positive().max(400).nullable().optional(),
  balanceGoals: z
    .array(z.object({ focus: z.enum(["PUSH", "PULL", "LEGS", "CORE", "GRIP"]), targetPercent: z.number().min(0).max(100) }))
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, goals, bodyWeightHistory] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { bodyWeightKg: true, name: true, username: true, avatarUrl: true },
    }),
    prisma.balanceGoal.findMany({ where: { userId: session.user.id } }),
    prisma.bodyWeightEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { dateKey: "desc" },
      take: 30,
      select: { dateKey: true, weightKg: true },
    }),
  ]);

  return NextResponse.json({ user, balanceGoals: goals, bodyWeightHistory: bodyWeightHistory.reverse() });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bodyWeightKg, balanceGoals } = parsed.data;
  const userId = session.user.id;

  if (bodyWeightKg != null) {
    const dateKey = todayGermanDateKey();
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { bodyWeightKg } }),
      prisma.bodyWeightEntry.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        create: { userId, dateKey, weightKg: bodyWeightKg },
        update: { weightKg: bodyWeightKg },
      }),
    ]);
  } else if (bodyWeightKg === null) {
    await prisma.user.update({ where: { id: userId }, data: { bodyWeightKg: null } });
  }

  if (balanceGoals) {
    await prisma.$transaction(
      balanceGoals.map((g: { focus: MuscleFocus; targetPercent: number }) =>
        prisma.balanceGoal.upsert({
          where: { userId_focus: { userId, focus: g.focus } },
          create: { userId, focus: g.focus, targetPercent: g.targetPercent },
          update: { targetPercent: g.targetPercent },
        })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
