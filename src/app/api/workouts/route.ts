import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePrSetIds } from "@/lib/personal-records";
import { autoShareToGroups } from "@/lib/workout-sharing";
import { contributeWorkoutSetToGoals } from "@/lib/goal-contributions";
import { focusFatigueSchema, deriveOverallExertion } from "@/lib/focus-fatigue";

const setSchema = z.object({
  exerciseId: z.string(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().positive().optional(),
});

const workoutSchema = z.object({
  notes: z.string().max(1000).optional(),
  perceivedExertion: z.number().int().min(1).max(10).optional(),
  focusFatigue: focusFatigueSchema,
  skinCondition: z.number().int().min(1).max(10).optional(),
  sets: z.array(setSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 50,
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { notes, perceivedExertion, focusFatigue, skinCondition, sets } = parsed.data;

  const created = await prisma.workoutSession.create({
    data: {
      userId: session.user.id,
      notes,
      perceivedExertion: deriveOverallExertion(focusFatigue, perceivedExertion),
      skinCondition,
      sets: {
        create: sets.map((set, index) => ({
          exerciseId: set.exerciseId,
          reps: set.reps,
          weightKg: set.weightKg,
          durationSec: set.durationSec,
          order: index,
        })),
      },
      focusFatigue: focusFatigue
        ? { create: focusFatigue.map((f) => ({ focus: f.focus, rating: f.rating })) }
        : undefined,
    },
    include: { sets: { include: { exercise: true } } },
  });

  // Recompute PRs across full history now that this session is in the DB,
  // then report which of *this* session's sets came out as a new PR - lets
  // the client show a "New PR!" toast per exercise right after saving.
  const prSetIds = await computePrSetIds(session.user.id);
  const newPrExerciseNames = Array.from(
    new Set(
      created.sets.filter((s) => prSetIds.has(s.id)).map((s) => s.exercise.name)
    )
  );

  const autoSharedGroupNames = await autoShareToGroups(session.user.id, created);

  // Group Goals linked to one of these exercises auto-fill from the raw
  // logged value - this never touches daily challenges, which stay a
  // separate, manual flow.
  await Promise.all(
    created.sets.map((set) =>
      contributeWorkoutSetToGoals({
        userId: session.user.id,
        exerciseId: set.exerciseId,
        reps: set.reps,
        durationSec: set.durationSec,
        workoutSetId: set.id,
      })
    )
  );

  return NextResponse.json(
    { session: created, newPrExerciseNames, autoSharedGroupNames },
    { status: 201 }
  );
}
