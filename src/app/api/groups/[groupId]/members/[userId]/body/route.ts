import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/group-auth";
import { getBodyData, BODY_WINDOWS } from "@/lib/body-data";

export const dynamic = "force-dynamic";

// A teammate's body map, scoped to what they trained while sharing into
// *this* group - never their private full history. Wishes stay personal
// and never show up here; injuries and notes do, so the group can see them.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, userId } = await params;

  const [viewer, target] = await Promise.all([
    getGroupMembership(session.user.id, groupId),
    getGroupMembership(userId, groupId),
  ]);
  if (!viewer || !target) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = BODY_WINDOWS.includes(requested) ? requested : 14;

  return NextResponse.json(await getBodyData(userId, days, { sharedInGroupId: groupId, includeWishes: false }));
}
