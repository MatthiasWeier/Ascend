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
    deadline: z.string().datetime().optional(),
    exerciseId: z.string().optional(),
  })
  .refine((v) => v.unit !== "CUSTOM" || !!v.customUnitLabel, {
    message: "customUnitLabel ist bei unit=CUSTOM erforderlich",
    path: ["customUnitLabel"],
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
    return NextResponse.json({ error: "Nur der Leader darf Ziele erstellen" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // An empty string is not "no exercise" - normalize it away so it can
  // never reach the DB and violate the exerciseId foreign key.
  const exerciseId = parsed.data.exerciseId?.trim() || undefined;

  if (exerciseId) {
    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });
    }
    if (!goalUnitMatchesExerciseType(parsed.data.unit, exercise.type)) {
      return NextResponse.json(
        {
          error:
            exercise.type === "HOLD"
              ? "Diese Übung ist zeitbasiert - die Einheit muss 'Dauer' sein"
              : "Diese Übung zählt in Wiederholungen - die Einheit muss 'Wiederholungen' sein",
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
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      exerciseId: exerciseId ?? null,
      createdById: session.user.id,
    },
  });

  let backfilledCount = 0;
  if (exerciseId) {
    backfilledCount = await backfillGoalFromHistory({
      id: goal.id,
      groupId,
      exerciseId,
      unit: goal.unit,
    });
  }

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals, backfilledCount }, { status: 201 });
}
