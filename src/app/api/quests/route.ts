import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";
import { MAX_ACTIVE_QUESTS, MAX_STEPS_PER_QUEST, REMINDER_CADENCES, questInclude } from "@/lib/quests";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  targetDateKey: z.string().regex(DATE_KEY_RE),
  sharedWithGroups: z.boolean().default(true),
  reminderCadence: z.enum(REMINDER_CADENCES as [string, ...string[]]).default("AUTO"),
  steps: z.array(z.string().trim().min(1).max(80)).max(MAX_STEPS_PER_QUEST).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quests = await prisma.quest.findMany({
    where: { userId: session.user.id },
    include: questInclude,
  });
  // Active first (soonest deadline on top), then finished ones, newest first.
  quests.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
    if (a.status === "ACTIVE") return a.targetDateKey.localeCompare(b.targetDateKey);
    return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
  });

  return NextResponse.json({ quests });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { title, description, targetDateKey, sharedWithGroups, reminderCadence, steps } = parsed.data;

  if (targetDateKey < todayGermanDateKey()) {
    return NextResponse.json({ error: "Das Zieldatum liegt in der Vergangenheit." }, { status: 400 });
  }

  const activeCount = await prisma.quest.count({ where: { userId, status: "ACTIVE" } });
  if (activeCount >= MAX_ACTIVE_QUESTS) {
    return NextResponse.json({ error: "Zu viele aktive Sidequests - schließ erst welche ab." }, { status: 400 });
  }

  const quest = await prisma.quest.create({
    data: {
      userId,
      title,
      description: description || null,
      targetDateKey,
      sharedWithGroups,
      reminderCadence: reminderCadence as (typeof REMINDER_CADENCES)[number],
      steps: { create: steps.map((stepTitle, i) => ({ title: stepTitle, position: i })) },
    },
    include: questInclude,
  });

  return NextResponse.json({ quest }, { status: 201 });
}
