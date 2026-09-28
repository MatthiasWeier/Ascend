import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_STEPS_PER_QUEST } from "@/lib/quests";

const createSchema = z.object({ title: z.string().trim().min(1).max(80) });

export async function POST(request: Request, { params }: { params: Promise<{ questId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    select: { userId: true, _count: { select: { steps: true } } },
  });
  if (!quest || quest.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (quest._count.steps >= MAX_STEPS_PER_QUEST) {
    return NextResponse.json({ error: "Zu viele Schritte." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const last = await prisma.questStep.findFirst({
    where: { questId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const step = await prisma.questStep.create({
    data: { questId, title: parsed.data.title, position: (last?.position ?? -1) + 1 },
  });
  return NextResponse.json({ step }, { status: 201 });
}
