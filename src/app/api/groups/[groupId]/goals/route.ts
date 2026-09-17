import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { buildGroupGoalsView } from "@/lib/group-goals";

const createGoalSchema = z.object({
  title: z.string().min(1).max(120),
  unit: z.string().min(1).max(30),
  targetValue: z.number().positive(),
  deadline: z.string().datetime().optional(),
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

  await prisma.groupGoal.create({
    data: {
      groupId,
      title: parsed.data.title,
      unit: parsed.data.unit,
      targetValue: parsed.data.targetValue,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      createdById: session.user.id,
    },
  });

  const goals = await buildGroupGoalsView(groupId, session.user.id);
  return NextResponse.json({ goals }, { status: 201 });
}
