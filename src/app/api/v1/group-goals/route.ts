import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { buildGroupGoalsView } from "@/lib/group-goals";

// Progress on every GroupGoal across all of the user's groups, flattened -
// read-only, same numbers the group's "Ziele" tab shows. No write path
// here on purpose: a manual contribution has group-social context (who
// logged what) that doesn't make sense coming from a script.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.userId },
    select: { groupId: true, group: { select: { name: true } } },
  });

  const perGroup = await Promise.all(
    memberships.map(async (m) => {
      const goals = await buildGroupGoalsView(m.groupId, auth.userId);
      return goals.map((g) => ({ groupId: m.groupId, groupName: m.group.name, ...g }));
    })
  );

  return NextResponse.json({ goals: perGroup.flat() });
}
