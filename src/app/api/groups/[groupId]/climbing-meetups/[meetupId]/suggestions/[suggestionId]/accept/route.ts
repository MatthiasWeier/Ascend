import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notify";
import { meetupDisplayName } from "@/lib/climbing-meetups";

// Creator only. Applies the proposed fields (only the ones that were set)
// to the meetup, clears everyone's reminded-flag so the changed plan gets
// re-announced, and tells the group what changed.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; meetupId: string; suggestionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, meetupId, suggestionId } = await params;
  const suggestion = await prisma.climbingMeetupSuggestion.findUnique({
    where: { id: suggestionId },
    include: { meetup: true, suggestedBy: { select: { name: true } } },
  });
  if (!suggestion || suggestion.meetupId !== meetupId || suggestion.meetup.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.meetup.createdById !== session.user.id) {
    return NextResponse.json({ error: "Only whoever planned the event can accept suggestions" }, { status: 403 });
  }
  if (suggestion.status !== "PENDING") {
    return NextResponse.json({ error: "Bereits bearbeitet" }, { status: 400 });
  }

  const data: { dateKey?: string; time?: string; location?: string } = {};
  if (suggestion.dateKey) data.dateKey = suggestion.dateKey;
  if (suggestion.time) data.time = suggestion.time;
  if (suggestion.location) data.location = suggestion.location;

  const [updatedMeetup] = await prisma.$transaction([
    prisma.climbingMeetup.update({ where: { id: meetupId }, data }),
    prisma.climbingMeetupParticipant.updateMany({ where: { meetupId }, data: { remindedAt: null } }),
    prisma.climbingMeetupSuggestion.update({ where: { id: suggestionId }, data: { status: "ACCEPTED" } }),
  ]);

  const [members, group, actor] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId, userId: { not: session.user.id } }, select: { userId: true } }),
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);
  if (members.length > 0) {
    const activityName = meetupDisplayName(updatedMeetup.activity, updatedMeetup.title);
    notifyUsers(members.map((m) => m.userId), {
      type: "CLIMBING_INVITE",
      actorId: session.user.id,
      actorName: actor?.name ?? "Jemand",
      groupName: group?.name ?? "",
      snippet: `${activityName}|${updatedMeetup.dateKey}`,
      url: `/dashboard/groups/${groupId}?tab=climbing`,
      pushTitle: group?.name ?? "Ascend",
      pushBody: `Your suggested change for "${activityName}" was accepted - take another look`,
    }).catch(() => {});
  }

  return NextResponse.json({ meetup: updatedMeetup });
}
