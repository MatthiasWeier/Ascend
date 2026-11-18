import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { todayGermanDateKey } from "@/lib/german-time";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";
import { MAX_ACTIVE_QUESTS, REMINDER_CADENCES, questInclude } from "@/lib/quests";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  targetDateKey: z.string().regex(DATE_KEY_RE).optional(),
  sharedWithGroups: z.boolean().optional(),
  reminderCadence: z.enum(REMINDER_CADENCES as [string, ...string[]]).optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

async function loadOwn(userId: string, questId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  return quest && quest.userId === userId ? quest : null;
}

// Tells the members of every group the user shares with that a quest was
// completed - each person once, even if they're in several of the same
// groups.
async function announceCompletion(userId: string, title: string) {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.groupMember.findMany({
      where: { userId },
      select: { group: { select: { id: true, name: true, members: { select: { userId: true } } } } },
    }),
  ]);
  const notified = new Set<string>([userId]);
  for (const { group } of memberships) {
    const recipients = group.members.map((m) => m.userId).filter((id) => !notified.has(id));
    if (recipients.length === 0) continue;
    recipients.forEach((id) => notified.add(id));
    await notifyUsers(recipients, {
      type: "QUEST_DONE",
      actorId: userId,
      actorName: user?.name ?? "Jemand",
      groupName: group.name,
      snippet: title,
      url: `/dashboard/groups/${group.id}?tab=quests`,
      pushTitle: group.name,
      pushBody: `${user?.name ?? "Jemand"} hat die Sidequest "${title}" geschafft!`,
    });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ questId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { questId } = await params;

  const quest = await loadOwn(userId, questId);
  if (!quest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { title, description, targetDateKey, sharedWithGroups, reminderCadence, status } = parsed.data;

  if (targetDateKey && targetDateKey !== quest.targetDateKey && targetDateKey < todayGermanDateKey()) {
    return NextResponse.json({ error: "The target date is in the past." }, { status: 400 });
  }

  const reopening = status === "ACTIVE" && quest.status === "COMPLETED";
  if (reopening) {
    const activeCount = await prisma.quest.count({ where: { userId, status: "ACTIVE" } });
    if (activeCount >= MAX_ACTIVE_QUESTS) {
      return NextResponse.json({ error: "Too many active sidequests - complete some first." }, { status: 400 });
    }
  }
  const completing = status === "COMPLETED" && quest.status === "ACTIVE";

  const updated = await prisma.quest.update({
    where: { id: questId },
    data: {
      title,
      description: description === undefined ? undefined : description || null,
      targetDateKey,
      sharedWithGroups,
      reminderCadence: reminderCadence as (typeof REMINDER_CADENCES)[number] | undefined,
      status,
      completedAt: completing ? new Date() : reopening ? null : undefined,
    },
    include: questInclude,
  });

  if (completing && updated.sharedWithGroups) {
    announceCompletion(userId, updated.title).catch(() => {});
  }

  return NextResponse.json({ quest: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ questId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  if (!(await loadOwn(session.user.id, questId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.quest.delete({ where: { id: questId } });
  return NextResponse.json({ ok: true });
}
