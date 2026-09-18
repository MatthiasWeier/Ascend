import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A full export of everything the app stores about this one user - no
// other user's data, no group-shared content that belongs to someone
// else. "Your data is yours" in practice, not just in the privacy policy.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, workoutSessions, bodyWeightEntries, climbingSends, balanceGoals, workoutTemplates] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, name: true, bodyWeightKg: true, createdAt: true },
      }),
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        include: {
          sets: { include: { exercise: { select: { name: true, type: true, focus: true } } }, orderBy: { order: "asc" } },
          focusFatigue: { select: { focus: true, rating: true } },
        },
      }),
      prisma.bodyWeightEntry.findMany({ where: { userId }, orderBy: { dateKey: "asc" } }),
      prisma.climbingSend.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.balanceGoal.findMany({ where: { userId } }),
      prisma.workoutTemplate.findMany({
        where: { userId },
        include: { entries: { include: { exercise: { select: { name: true } } }, orderBy: { order: "asc" } } },
      }),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    format: "ascend-export-v1",
    user,
    workoutSessions: workoutSessions.map((s) => ({
      date: s.date,
      notes: s.notes,
      perceivedExertion: s.perceivedExertion,
      skinCondition: s.skinCondition,
      focusFatigue: s.focusFatigue,
      sets: s.sets.map((set) => ({
        exerciseName: set.exercise.name,
        exerciseType: set.exercise.type,
        exerciseFocus: set.exercise.focus,
        reps: set.reps,
        weightKg: set.weightKg,
        durationSec: set.durationSec,
        setType: set.setType,
        notes: set.notes,
      })),
    })),
    bodyWeightEntries: bodyWeightEntries.map((e) => ({ dateKey: e.dateKey, weightKg: e.weightKg })),
    climbingSends: climbingSends.map((c) => ({
      date: c.date,
      style: c.style,
      grade: c.grade,
      attempts: c.attempts,
      count: c.count,
    })),
    balanceGoals: balanceGoals.map((g) => ({ focus: g.focus, targetPercent: g.targetPercent })),
    workoutTemplates: workoutTemplates.map((t) => ({
      name: t.name,
      entries: t.entries.map((e) => ({ exerciseName: e.exercise.name })),
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ascend-export-${user?.username ?? "user"}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
