import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { buildGroupGoalsView } from "@/lib/group-goals";
import { backfillGoalFromHistory, goalUnitMatchesExerciseType } from "@/lib/goal-contributions";

const createGoalSchema = z
  .object({
    title: z.string().min(1).max(120),
    unit: z.enum(["REPS", "DURATION_SEC", "KM", "CUSTOM"]),
    customUnitLabel: z.string().min(1).max(20).optional(),
    targetValue: z.number().positive(),
    startDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    exerciseIds: z.array(z.string()).max(20).default([]),
  })
  .refine((v) => v.unit !== "CUSTOM" || !!v.customUnitLabel, {
    message: "customUnitLabel ist bei unit=CUSTOM erforderlich",
    path: ["customUnitLabel"],
  })
  .refine((v) => !v.startDate || !v.deadline || new Date(v.startDate) <= new Date(v.deadline), {
    message: "Start muss vor der Frist liegen",
    path: ["startDate"],
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Only the leader can create goals" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const exerciseIds = Array.from(new Set(parsed.data.exerciseIds));

  if (exerciseIds.length > 0) {
    const exercises = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
    if (exercises.length !== exerciseIds.length) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }
    const mismatch = exercises.find((e) => !goalUnitMatchesExerciseType(parsed.data.unit, e.type));
    if (mismatch) {
      return NextResponse.json(
        {
          error:
            mismatch.type === "HOLD"
              ? "This exercise is time-based - the unit must be 'Duration'"
              : "This exercise counts in reps - the unit must be 'Repetitions'",
        },
        { status: 400 }
      );
    }
  }

  const goal = await prisma.groupGoal.create({
    data: {
      groupId,
      title: parsed.data.title,
      unit: parsed.data.unit,
      customUnitLabel: parsed.data.unit === "CUSTOM" ? parsed.data.customUnitLabel : null,
      targetValue: parsed.data.targetValue,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      exercises: { connect: exerciseIds.map((id) => ({ id })) },
      createdById: session.user.id,
    },
  });

  let backfilledCount = 0;
  if (exerciseIds.length > 0) {
    backfilledCount = await backfillGoalFromHistory({
      id: goal.id,
      groupId,
      exerciseIds,
      unit: goal.unit,
      startDate: goal.startDate,
      deadline: goal.deadline,
    });
  }

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals, backfilledCount }, { status: 201 });
}
