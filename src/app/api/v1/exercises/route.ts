import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId: auth.userId }, select: { groupId: true } })
  ).map((m) => m.groupId);

  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdById: auth.userId },
        ...(myGroupIds.length > 0 ? [{ groupId: { in: myGroupIds } }] : []),
      ],
    },
    select: { id: true, name: true, type: true, focus: true, isBodyweight: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ exercises });
}

const muscleEnum = z.enum([
  "CHEST",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "LATS",
  "UPPER_BACK",
  "LOWER_BACK",
  "ABS",
  "OBLIQUES",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
]);

const createExerciseSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  type: z.enum(["REPS", "HOLD"]),
  focus: z.enum(["PUSH", "PULL", "LEGS", "CORE", "GRIP"]),
  isBodyweight: z.boolean().default(false),
  groupId: z.string().optional(),
  primaryMuscles: z.array(muscleEnum).max(14).default([]),
  secondaryMuscles: z.array(muscleEnum).max(14).default([]),
});

// Same validation/shape as POST /api/exercises - a custom exercise created
// here is indistinguishable from one created in the app.
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { groupId, primaryMuscles, secondaryMuscles, ...rest } = parsed.data;

  if (groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: auth.userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of that group" }, { status: 403 });
    }
  }

  const existing = await prisma.exercise.findUnique({ where: { name: rest.name } });
  if (existing) {
    return NextResponse.json({ error: "Eine Übung mit diesem Namen existiert bereits" }, { status: 409 });
  }

  const exercise = await prisma.exercise.create({
    data: {
      ...rest,
      isDefault: false,
      createdById: auth.userId,
      groupId: groupId ?? null,
      muscles: {
        create: [
          ...primaryMuscles.map((muscle) => ({ muscle, role: "PRIMARY" as const })),
          ...secondaryMuscles.filter((m) => !primaryMuscles.includes(m)).map((muscle) => ({ muscle, role: "SECONDARY" as const })),
        ],
      },
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
