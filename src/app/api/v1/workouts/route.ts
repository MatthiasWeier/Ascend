import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { syncWorkoutRepsToChallenges } from "@/lib/challenge-workout-sync";

const setSchema = z.object({
  exerciseId: z.string(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSec: z.number().int().positive().optional(),
  setType: z.enum(["WARMUP", "NORMAL", "DROP", "FAILURE"]).optional(),
  notes: z.string().max(500).optional(),
});

const workoutSchema = z.object({
  date: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  sets: z.array(setSchema).min(1),
});

// Read-only-ish personal API for your own scripts/automations - not a
// public/third-party integration surface. See Settings for key
// management. Deliberately doesn't touch PR/goal-contribution side
// effects; use the regular app for that.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: auth.userId },
    orderBy: { date: "desc" },
    take: limit,
    include: { sets: { include: { exercise: { select: { name: true } } }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.workoutSession.create({
    data: {
      userId: auth.userId,
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
    include: { sets: { include: { exercise: { select: { name: true } } } } },
  });

  await syncWorkoutRepsToChallenges(auth.userId, created.date);

  return NextResponse.json({ session: created }, { status: 201 });
}
