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

  const goal = await prisma.groupGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groupGoalContribution.create({
    data: { goalId, userId: session.user.id, amount: parsed.data.amount },
  });

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals }, { status: 201 });
}
