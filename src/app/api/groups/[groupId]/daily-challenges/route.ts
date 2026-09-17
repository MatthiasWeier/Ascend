import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { buildDailyChallengesView, MAX_ACTIVE_DAILY_CHALLENGES } from "@/lib/daily-challenges";

const activateSchema = z.object({ challengeTemplateId: z.string() });

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

  const view = await buildDailyChallengesView(groupId, session.user.id);
  return NextResponse.json(view);
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
    return NextResponse.json({ error: "Nur der Leader darf Challenges aktivieren" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const activeCount = await prisma.groupDailyChallenge.count({ where: { groupId, isActive: true } });
  if (activeCount >= MAX_ACTIVE_DAILY_CHALLENGES) {
    return NextResponse.json(
      { error: `Maximal ${MAX_ACTIVE_DAILY_CHALLENGES} aktive Challenges pro Gruppe` },
      { status: 400 }
    );
  }

  const existing = await prisma.groupDailyChallenge.findUnique({
    where: { groupId_challengeTemplateId: { groupId, challengeTemplateId: parsed.data.challengeTemplateId } },
  });
  if (existing) {
    if (existing.isActive) {
      return NextResponse.json({ error: "Challenge ist bereits aktiv" }, { status: 400 });
    }
    await prisma.groupDailyChallenge.update({ where: { id: existing.id }, data: { isActive: true } });
  } else {
    await prisma.groupDailyChallenge.create({
      data: {
        groupId,
        challengeTemplateId: parsed.data.challengeTemplateId,
        activatedById: session.user.id,
      },
    });
  }

  const view = await buildDailyChallengesView(groupId, session.user.id);
  return NextResponse.json(view, { status: 201 });
}
