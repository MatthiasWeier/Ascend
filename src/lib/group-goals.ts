import { prisma } from "@/lib/prisma";
import { formatGoalUnit } from "@/lib/goal-units";

export async function buildGroupGoalsView(groupId: string, viewerId: string) {
  const goals = await prisma.groupGoal.findMany({
    where: { groupId },
    include: {
      exercise: { select: { id: true, name: true } },
      contributions: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return goals.map((goal) => {
    const totalsByUser = new Map<string, { userId: string; userName: string; amount: number }>();
    let total = 0;
    for (const c of goal.contributions) {
      total += c.amount;
      const existing = totalsByUser.get(c.userId);
      if (existing) {
        existing.amount += c.amount;
      } else {
        totalsByUser.set(c.userId, { userId: c.userId, userName: c.user.name, amount: c.amount });
      }
    }
    const contributors = Array.from(totalsByUser.values())
      .sort((a, b) => b.amount - a.amount)
      .map((c) => ({ ...c, isMe: c.userId === viewerId }));

    return {
      id: goal.id,
      title: goal.title,
      unit: goal.unit,
      unitLabel: formatGoalUnit(goal.unit, goal.customUnitLabel),
      targetValue: goal.targetValue,
      deadline: goal.deadline,
      exerciseId: goal.exerciseId,
      exerciseName: goal.exercise?.name ?? null,
      total,
      progress: goal.targetValue > 0 ? Math.min(1, total / goal.targetValue) : 0,
      isComplete: total >= goal.targetValue,
      contributors,
    };
  });
}
