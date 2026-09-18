import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contributeWorkoutSetToGoals } from "@/lib/goal-contributions";

const setSchema = z.object({
  exerciseId: z.string(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  notes: z.string().max(1000).optional(),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  skinCondition: z.number().int().min(1).max(10).optional(),
  sets: z.array(setSchema).min(1),
});

async function findOwnedSession(sessionId: string, userId: string) {
  const workoutSession = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!workoutSession || workoutSession.userId !== userId) return null;
  return workoutSession;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!workoutSession || workoutSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session: workoutSession });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const existing = await findOwnedSession(sessionId, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const oldSetIds = (
    await prisma.workoutSet.findMany({ where: { sessionId }, select: { id: true } })
  ).map((s) => s.id);

  // Replace the sets wholesale rather than trying to diff/patch individual
  // rows - simpler, and correct as long as any auto-contributions sourced
  // from the old set ids are cleared out first (otherwise a goal linked to
  // one of these exercises would keep counting stale numbers forever,
  // since sourceId isn't a real foreign key that cascades on its own).
  await prisma.$transaction([
    prisma.groupGoalContribution.deleteMany({
      where: { source: "WORKOUT", sourceId: { in: oldSetIds } },
    }),
    prisma.workoutSet.deleteMany({ where: { sessionId } }),
    prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        notes: parsed.data.notes,
        perceivedExertion: parsed.data.perceivedExertion,
        skinCondition: parsed.data.skinCondition,
        sets: {
          create: parsed.data.sets.map((set, index) => ({
            exerciseId: set.exerciseId,
            reps: set.reps,
            weightKg: set.weightKg,
            durationSec: set.durationSec,
            order: index,
          })),
        },
      },
    }),
  ]);

  const updated = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  // Re-run auto-fill for any exercise linked to a Group Goal, using the
  // edited values.
  await Promise.all(
    (updated?.sets ?? []).map((set) =>
      contributeWorkoutSetToGoals({
        userId: session.user.id,
        exerciseId: set.exerciseId,
        reps: set.reps,
        durationSec: set.durationSec,
        workoutSetId: set.id,
      })
    )
  );

  return NextResponse.json({ session: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const existing = await findOwnedSession(sessionId, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const setIds = (
    await prisma.workoutSet.findMany({ where: { sessionId }, select: { id: true } })
  ).map((s) => s.id);

  await prisma.$transaction([
    prisma.groupGoalContribution.deleteMany({
      where: { source: "WORKOUT", sourceId: { in: setIds } },
    }),
    prisma.workoutSession.delete({ where: { id: sessionId } }),
  ]);

  return NextResponse.json({ ok: true });
}
