import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  done: z.boolean().optional(),
  move: z.enum(["up", "down"]).optional(),
});

async function loadOwnStep(userId: string, questId: string, stepId: string) {
  const step = await prisma.questStep.findUnique({
    where: { id: stepId },
    include: { quest: { select: { userId: true } } },
  });
  return step && step.questId === questId && step.quest.userId === userId ? step : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId, stepId } = await params;

  const step = await loadOwnStep(session.user.id, questId, stepId);
  if (!step) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { title, done, move } = parsed.data;

  if (move) {
    // Swap positions with the neighbour in that direction (positions may
    // have gaps after deletions, so look the neighbour up rather than +/-1).
    const neighbour = await prisma.questStep.findFirst({
      where: {
        questId,
        position: move === "up" ? { lt: step.position } : { gt: step.position },
      },
      orderBy: { position: move === "up" ? "desc" : "asc" },
    });
    if (neighbour) {
      await prisma.$transaction([
        prisma.questStep.update({ where: { id: step.id }, data: { position: neighbour.position } }),
        prisma.questStep.update({ where: { id: neighbour.id }, data: { position: step.position } }),
      ]);
    }
  }

  if (title !== undefined || done !== undefined) {
    await prisma.questStep.update({
      where: { id: step.id },
      data: {
        title,
        doneAt: done === undefined ? undefined : done ? new Date() : null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ questId: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId, stepId } = await params;

  if (!(await loadOwnStep(session.user.id, questId, stepId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.questStep.delete({ where: { id: stepId } });
  return NextResponse.json({ ok: true });
}
