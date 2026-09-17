import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const incrementSchema = z.object({ amount: z.number().int().refine((n) => [1, 2, 5, 10].includes(n)) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = rateLimit(`increment:${session.user.id}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen, kurz warten." }, { status: 429 });
  }

  const { attemptId } = await params;

  const attempt = await prisma.dailyChallengeAttempt.findUnique({
    where: { id: attemptId },
    include: { userChallengeGoal: { select: { userId: true } } },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attempt.userChallengeGoal.userId !== session.user.id) {
    return NextResponse.json({ error: "Das ist nicht dein Versuch" }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Versuch ist bereits abgeschlossen" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = incrementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const newReps = attempt.currentReps + parsed.data.amount;
  const justCompleted = newReps >= attempt.targetRepsSnapshot;

  const updated = await prisma.dailyChallengeAttempt.update({
    where: { id: attemptId },
    data: {
      currentReps: newReps,
      ...(justCompleted ? { status: "COMPLETED", completedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ attempt: updated });
}
