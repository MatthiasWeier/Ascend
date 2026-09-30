import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { buildGroupGoalsView } from "@/lib/group-goals";
import { backfillGoalFromHistory, goalUnitMatchesExerciseType } from "@/lib/goal-contributions";

const updateGoalSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  unit: z.enum(["REPS", "DURATION_SEC", "KM", "CUSTOM"]).optional(),
  customUnitLabel: z.string().min(1).max(20).optional(),
  targetValue: z.number().positive().optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  exerciseIds: z.array(z.string()).max(20).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, goalId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Nur der Leader darf Ziele bearbeiten" }, { status: 403 });
  }

  const goal = await prisma.groupGoal.findUnique({ where: { id: goalId }, include: { exercises: true } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { title, unit, customUnitLabel, targetValue, startDate, deadline, exerciseIds } = parsed.data;

  const resultingUnit = unit ?? goal.unit;
  if (resultingUnit === "CUSTOM" && !(customUnitLabel ?? goal.customUnitLabel)) {
    return NextResponse.json({ error: "customUnitLabel ist bei unit=CUSTOM erforderlich" }, { status: 400 });
  }
  const resultingStart = startDate === undefined ? goal.startDate : startDate ? new Date(startDate) : null;
  const resultingDeadline = deadline === undefined ? goal.deadline : deadline ? new Date(deadline) : null;
  if (resultingStart && resultingDeadline && resultingStart > resultingDeadline) {
    return NextResponse.json({ error: "Start muss vor der Frist liegen" }, { status: 400 });
  }

  const resultingExerciseIds =
    exerciseIds === undefined ? goal.exercises.map((e) => e.id) : Array.from(new Set(exerciseIds));
  if (resultingExerciseIds.length > 0) {
    const exercises = await prisma.exercise.findMany({ where: { id: { in: resultingExerciseIds } } });
    if (exercises.length !== resultingExerciseIds.length) {
      return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });
    }
    const mismatch = exercises.find((e) => !goalUnitMatchesExerciseType(resultingUnit, e.type));
    if (mismatch) {
      return NextResponse.json(
        {
          error:
            mismatch.type === "HOLD"
              ? "Diese Übung ist zeitbasiert - die Einheit muss 'Dauer' sein"
              : "Diese Übung zählt in Wiederholungen - die Einheit muss 'Wiederholungen' sein",
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.groupGoal.update({
    where: { id: goalId },
    data: {
      title,
      unit,
      customUnitLabel: resultingUnit === "CUSTOM" ? (customUnitLabel ?? goal.customUnitLabel) : null,
      targetValue,
      startDate: startDate === undefined ? undefined : resultingStart,
      deadline: deadline === undefined ? undefined : resultingDeadline,
      exercises: exerciseIds === undefined ? undefined : { set: resultingExerciseIds.map((id) => ({ id })) },
    },
  });

  // Catch up any history for newly-linked exercises - skipDuplicates makes
  // re-running this for exercises that were already linked a no-op.
  if (resultingExerciseIds.length > 0) {
    await backfillGoalFromHistory({
      id: updated.id,
      groupId,
      exerciseIds: resultingExerciseIds,
      unit: updated.unit,
      startDate: updated.startDate,
      deadline: updated.deadline,
    });
  }

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, goalId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Nur der Leader darf Ziele löschen" }, { status: 403 });
  }

  const goal = await prisma.groupGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupGoal.delete({ where: { id: goalId } });
  return NextResponse.json({ ok: true });
}
