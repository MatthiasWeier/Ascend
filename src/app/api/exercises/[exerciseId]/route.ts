import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_MUSCLES } from "@/lib/muscles";
import { findManageableExercise } from "@/lib/exercise-access";

const muscleEnum = z.enum(ALL_MUSCLES as [string, ...string[]]);

const editSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["REPS", "HOLD"]).optional(),
  focus: z.enum(["PUSH", "PULL", "LEGS", "CORE", "GRIP"]).optional(),
  isBodyweight: z.boolean().optional(),
  primaryMuscles: z.array(muscleEnum).max(14).optional(),
  secondaryMuscles: z.array(muscleEnum).max(14).optional(),
});

type MuscleName = (typeof ALL_MUSCLES)[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ exerciseId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { exerciseId } = await params;
  const exercise = await findManageableExercise(exerciseId, session.user.id);
  if (!exercise) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = editSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { primaryMuscles, secondaryMuscles, type, name, ...rest } = parsed.data;

  if (name && name !== exercise.name) {
    const clash = await prisma.exercise.findUnique({ where: { name } });
    if (clash) {
      return NextResponse.json({ error: "An exercise with this name already exists" }, { status: 409 });
    }
  }

  const typeChanged = type != null && type !== exercise.type;
  if (typeChanged) {
    // A goal counts reps or seconds, so its linked exercise can't switch kind.
    const goals = await prisma.groupGoal.count({ where: { exercises: { some: { id: exerciseId } } } });
    if (goals > 0) {
      return NextResponse.json({ error: "The exercise is linked to a group goal - its type can't be changed" }, { status: 409 });
    }
  }

  const ops = [];
  ops.push(
    prisma.exercise.update({
      where: { id: exerciseId },
      data: { ...rest, ...(name ? { name } : {}), ...(typeChanged ? { type } : {}) },
    })
  );
  // Already logged sets keep their numbers, reinterpreted: what was typed as
  // reps becomes seconds (and back) instead of vanishing from the display.
  if (typeChanged) {
    ops.push(
      type === "HOLD"
        ? prisma.$executeRaw`UPDATE "WorkoutSet" SET "durationSec" = "reps", "reps" = NULL WHERE "exerciseId" = ${exerciseId} AND "reps" IS NOT NULL AND "durationSec" IS NULL`
        : prisma.$executeRaw`UPDATE "WorkoutSet" SET "reps" = "durationSec", "durationSec" = NULL WHERE "exerciseId" = ${exerciseId} AND "durationSec" IS NOT NULL AND "reps" IS NULL`
    );
  }
  if (primaryMuscles || secondaryMuscles) {
    const primary = (primaryMuscles ?? []) as MuscleName[];
    const secondary = ((secondaryMuscles ?? []) as MuscleName[]).filter((m) => !primary.includes(m));
    ops.push(prisma.exerciseMuscle.deleteMany({ where: { exerciseId } }));
    ops.push(
      prisma.exerciseMuscle.createMany({
        data: [
          ...primary.map((muscle) => ({ exerciseId, muscle, role: "PRIMARY" as const })),
          ...secondary.map((muscle) => ({ exerciseId, muscle, role: "SECONDARY" as const })),
        ],
      })
    );
  }
  const [updated, converted] = await prisma.$transaction(ops);
  return NextResponse.json({ exercise: updated, convertedSets: typeChanged ? converted : 0 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ exerciseId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { exerciseId } = await params;
  const exercise = await findManageableExercise(exerciseId, session.user.id);
  if (!exercise) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [sets, goals, challenges] = await Promise.all([
    prisma.workoutSet.count({ where: { exerciseId } }),
    prisma.groupGoal.count({ where: { exercises: { some: { id: exerciseId } } } }),
    prisma.challengeTemplate.count({ where: { exerciseId } }),
  ]);
  if (sets > 0) {
    return NextResponse.json({ error: "The exercise is still used in workouts", count: sets }, { status: 409 });
  }
  if (goals > 0 || challenges > 0) {
    return NextResponse.json({ error: "The exercise is linked to a group goal or a challenge" }, { status: 409 });
  }

  // Templates just lose the entry; the exercise's muscles cascade.
  await prisma.$transaction([
    prisma.workoutTemplateEntry.deleteMany({ where: { exerciseId } }),
    prisma.exercise.delete({ where: { id: exerciseId } }),
  ]);
  return NextResponse.json({ ok: true });
}
