import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { buildGroupGoalsView } from "@/lib/group-goals";

const contributeSchema = z.object({ amount: z.number().positive().max(1_000_000) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, goalId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const goal = await prisma.groupGoal.findUnique({ where: { id: goalId }, include: { _count: { select: { exercises: true } } } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (goal._count.exercises > 0) {
    return NextResponse.json(
      { error: "Dieses Ziel wird automatisch aus Workouts/Challenges getrackt" },
      { status: 400 }
    );
  }
  const now = new Date();
  if (goal.startDate && now < goal.startDate) {
    return NextResponse.json({ error: "Dieses Ziel hat noch nicht begonnen" }, { status: 400 });
  }
  if (goal.deadline && now > goal.deadline) {
    return NextResponse.json({ error: "Die Frist für dieses Ziel ist abgelaufen" }, { status: 400 });
  }

  await prisma.groupGoalContribution.create({
    data: { goalId, userId: session.user.id, amount: parsed.data.amount, source: "MANUAL" },
  });

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals }, { status: 201 });
}
