import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    include: { meetup: true },
  });
  if (!suggestion || suggestion.meetupId !== meetupId || suggestion.meetup.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.meetup.createdById !== session.user.id) {
    return NextResponse.json({ error: "Only whoever planned the event can decline suggestions" }, { status: 403 });
  }
  if (suggestion.status !== "PENDING") {
    return NextResponse.json({ error: "Bereits bearbeitet" }, { status: 400 });
  }
  const updated = await prisma.climbingMeetupSuggestion.update({ where: { id: suggestionId }, data: { status: "DECLINED" } });
  return NextResponse.json({ suggestion: updated });
}
