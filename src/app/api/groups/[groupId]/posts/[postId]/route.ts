import { NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { storageDeleteFile } from "@/lib/storage";

const editSchema = z.object({ content: z.string().min(1).max(2000) });

// Only the author can edit - unlike delete, the leader has no business
// rewriting someone else's words. Never a WORKOUT_SHARE: its content is a
// generated summary of the actual workout, not free text.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId } = await params;

  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const post = await prisma.groupPost.findUnique({ where: { id: postId } });
  if (!post || post.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (post.userId !== session.user.id) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  if (post.type === "WORKOUT_SHARE") {
    return NextResponse.json({ error: "Workout-Shares lassen sich nicht bearbeiten" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.groupPost.update({
    where: { id: postId },
    data: { content: parsed.data.content },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ post: updated });
}

// Everyone can delete their own post (any type). The leader can also
// delete anyone's TEXT/PHOTO post to moderate the chat, but never a
// WORKOUT_SHARE - that's someone else's actual training record, not a
// message, and stays theirs to remove or not.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId } = await params;

  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const post = await prisma.groupPost.findUnique({ where: { id: postId } });
  if (!post || post.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAuthor = post.userId === session.user.id;
  const isLeaderModeratingMessage =
    membership.role === "LEADER" && post.type !== "WORKOUT_SHARE" && !isAuthor;
  if (!isAuthor && !isLeaderModeratingMessage) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  if (post.type === "PHOTO" && post.imageUrl) {
    const filename = path.basename(post.imageUrl);
    await storageDeleteFile(`${groupId}/${filename}`);
  }

  await prisma.groupPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true });
}
