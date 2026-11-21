import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncWorkoutRepsToChallenges } from "@/lib/challenge-workout-sync";
import { contributeWorkoutSetToGoals } from "@/lib/goal-contributions";
import { focusFatigueSchema, deriveOverallExertion } from "@/lib/focus-fatigue";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { attachPhotos, deletePhotoFiles } from "@/lib/workout-photos";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";

const setSchema = z.object({
  exerciseId: z.string(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().positive().optional(),
  distanceMeters: z.number().positive().max(200000).optional(),
  setType: z.enum(["WARMUP", "NORMAL", "DROP", "FAILURE"]).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  date: z.string().regex(DATE_KEY_RE).optional(),
  notes: z.string().max(1000).optional(),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  focusFatigue: focusFatigueSchema,
  skinCondition: z.number().int().min(1).max(10).optional(),
  sets: z.array(setSchema).min(1).max(100),
  photoIds: z.array(z.string()).max(10).optional(),
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
    include: {
      sets: { include: { exercise: true }, orderBy: { order: "asc" } },
      focusFatigue: { select: { focus: true, rating: true } },
      photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
    },
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
  if (parsed.data.date && parsed.data.date > todayGermanDateKey()) {
    return NextResponse.json({ error: "That date is in the future" }, { status: 400 });
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
    prisma.workoutFocusFatigue.deleteMany({ where: { sessionId } }),
    prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        date: parsed.data.date ? new Date(`${parsed.data.date}T12:00:00.000Z`) : undefined,
        notes: parsed.data.notes,
        perceivedExertion: deriveOverallExertion(parsed.data.focusFatigue, parsed.data.perceivedExertion),
        skinCondition: parsed.data.skinCondition,
        sets: {
          create: parsed.data.sets.map((set, index) => ({
            exerciseId: set.exerciseId,
            reps: set.reps,
            weightKg: set.weightKg,
            durationSec: set.durationSec,
            distanceMeters: set.distanceMeters,
            setType: set.setType,
            notes: set.notes,
            order: index,
          })),
        },
        focusFatigue: parsed.data.focusFatigue
          ? { create: parsed.data.focusFatigue.map((f) => ({ focus: f.focus, rating: f.rating })) }
          : undefined,
      },
    }),
  ]);

  await attachPhotos(session.user.id, sessionId, parsed.data.photoIds);

  const updated = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  // Keep any group post(s) this workout was shared into in sync with the
  // edit - silently, as a content update, never a fresh push notification
  // (nobody needs to be re-notified just because a rep count was fixed).
  if (updated) {
    await prisma.groupPost.updateMany({
      where: { workoutSessionId: sessionId, type: "WORKOUT_SHARE" },
      data: { content: summarizeWorkoutSession(updated) },
    });
  }

  // Re-run auto-fill for any exercise linked to a Group Goal, using the
  // edited values. Warm-up sets don't count - they're not working sets.
  await Promise.all(
    (updated?.sets ?? [])
      .filter((set) => set.setType !== "WARMUP")
      .map((set) =>
        contributeWorkoutSetToGoals({
          userId: session.user.id,
          exerciseId: set.exerciseId,
          reps: set.reps,
          durationSec: set.durationSec,
          workoutSetId: set.id,
        })
      )
  );

  // Re-sync for both the old and new date - a workout moved off today (or
  // onto today) needs today's challenge reps recomputed either way; the
  // sync itself re-sums live from the DB and no-ops for a non-today date,
  // so calling it for both is always safe.
  await syncWorkoutRepsToChallenges(session.user.id, existing.date);
  if (updated && germanDateKey(updated.date) !== germanDateKey(existing.date)) {
    await syncWorkoutRepsToChallenges(session.user.id, updated.date);
  }

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

  const photos = await prisma.workoutPhoto.findMany({ where: { sessionId } });

  await prisma.$transaction([
    prisma.groupGoalContribution.deleteMany({
      where: { source: "WORKOUT", sourceId: { in: setIds } },
    }),
    prisma.workoutSession.delete({ where: { id: sessionId } }),
  ]);
  await deletePhotoFiles(photos);
  await syncWorkoutRepsToChallenges(session.user.id, existing.date);

  return NextResponse.json({ ok: true });
}
