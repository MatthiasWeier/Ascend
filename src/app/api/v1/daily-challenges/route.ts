import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";

// Today's status for every active daily-challenge goal across all of the
// user's groups - same data the dashboard challenge cards show, flattened
// for external consumption. Vetoed (isInvalidated) goals are excluded,
// same as everywhere else that reads these.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayGermanDateKey();
  const goals = await prisma.userChallengeGoal.findMany({
    where: {
      userId: auth.userId,
      isInvalidated: false,
      groupDailyChallenge: { isActive: true },
    },
    include: {
      groupDailyChallenge: {
        include: {
          group: { select: { id: true, name: true } },
          challengeTemplate: { select: { name: true } },
        },
      },
      attempts: { where: { dateKey: today } },
    },
  });

  return NextResponse.json({
    challenges: goals.map((g) => {
      const attempt = g.attempts[0] ?? null;
      return {
        groupId: g.groupDailyChallenge.group.id,
        groupName: g.groupDailyChallenge.group.name,
        templateName: g.groupDailyChallenge.challengeTemplate.name,
        targetReps: attempt?.targetRepsSnapshot ?? g.targetReps,
        currentReps: attempt?.currentReps ?? 0,
        status: attempt?.status ?? "NOT_STARTED",
      };
    }),
  });
}
