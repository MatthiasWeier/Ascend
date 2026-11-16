import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { syncWorkoutRepsToChallenges } from "@/lib/challenge-workout-sync";
import { germanDateKey } from "@/lib/german-time";

const setSchema = z.object({
  exerciseId: z.string(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().positive().optional(),
  setType: z.enum(["WARMUP", "NORMAL", "DROP", "FAILURE"]).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  date: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  sets: z.array(setSchema).min(1),
});

async function findOwnedSession(sessionId: string, userId: string) {
  const workoutSession = await prisma.workoutSession.findUnique({ where: { id: sessionId } });
  if (!workoutSession || workoutSession.userId !== userId) return null;
  return workoutSession;
}

// Single-session counterpart to GET/POST /api/v1/workouts - same personal
// automation surface, same "no PR/goal-contribution side effects from
// here" philosophy, no photo support (that needs a multipart upload flow
// no script needs). The one thing that *is* handled, because skipping it
// would silently corrupt data: clearing out any GroupGoalContribution rows
// tied to the sets being replaced/removed. Those rows aren't a real
// cascading foreign key (see the main app's PATCH/DELETE routes), so a set
// created via the regular app and then edited or deleted here would
// otherwise leave a stale contribution behind forever.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: { select: { name: true } } }, orderBy: { order: "asc" } } },
  });
  if (!workoutSession || workoutSession.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session: workoutSession });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const existing = await findOwnedSession(sessionId, auth.userId);
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

  await prisma.$transaction([
    prisma.groupGoalContribution.deleteMany({
      where: { source: "WORKOUT", sourceId: { in: oldSetIds } },
    }),
    prisma.workoutSet.deleteMany({ where: { sessionId } }),
    prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        notes: parsed.data.notes,
        sets: {
          create: parsed.data.sets.map((set, index) => ({
            exerciseId: set.exerciseId,
            reps: set.reps,
            weightKg: set.weightKg,
            durationSec: set.durationSec,
            setType: set.setType,
            notes: set.notes,
            order: index,
          })),
        },
      },
    }),
  ]);

  const updated = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: { select: { name: true } } }, orderBy: { order: "asc" } } },
  });

  await syncWorkoutRepsToChallenges(auth.userId, existing.date);
  if (updated && germanDateKey(updated.date) !== germanDateKey(existing.date)) {
    await syncWorkoutRepsToChallenges(auth.userId, updated.date);
  }

  return NextResponse.json({ session: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const existing = await findOwnedSession(sessionId, auth.userId);
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
  await syncWorkoutRepsToChallenges(auth.userId, existing.date);

  return NextResponse.json({ ok: true });
}
