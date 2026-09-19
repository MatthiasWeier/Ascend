import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";

const editSchema = z.object({ content: z.string().trim().min(1).max(2000) });

async function loadComment(groupId: string, postId: string, commentId: string) {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    include: { post: { select: { groupId: true } } },
  });
  return comment && comment.postId === postId && comment.post.groupId === groupId ? comment : null;
}

// Only the author edits - a leader can moderate (delete) but not reword.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId, commentId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const comment = await loadComment(groupId, postId, commentId);
  if (!comment || comment.deletedAt) {
    return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
  }
  if (comment.userId !== session.user.id) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.postComment.update({
    where: { id: commentId },
    data: { content: parsed.data.content, editedAt: new Date() },
  });
  return NextResponse.json({ content: updated.content, editedAt: updated.editedAt });
}

// A comment with replies becomes a "[gelöscht]" stub so the thread stays
// readable; one without replies is removed outright, and any already-deleted
// ancestors that were only kept alive by it are pruned too.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId, commentId } = await params;
  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const comment = await loadComment(groupId, postId, commentId);
  if (!comment || comment.deletedAt) {
    return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
  }
  if (comment.userId !== session.user.id && membership.role !== "LEADER") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const replyCount = await prisma.postComment.count({ where: { parentId: commentId } });
  if (replyCount > 0) {
    await prisma.postComment.update({ where: { id: commentId }, data: { deletedAt: new Date(), content: "" } });
    return NextResponse.json({ ok: true });
  }

  await prisma.postComment.delete({ where: { id: commentId } });
  let parentId = comment.parentId;
  while (parentId) {
    const parent = await prisma.postComment.findUnique({ where: { id: parentId } });
    if (!parent || !parent.deletedAt) break;
    if ((await prisma.postComment.count({ where: { parentId: parent.id } })) > 0) break;
    await prisma.postComment.delete({ where: { id: parent.id } });
    parentId = parent.parentId;
  }
  return NextResponse.json({ ok: true });
}
