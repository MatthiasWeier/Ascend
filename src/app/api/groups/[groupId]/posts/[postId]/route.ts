import { NextResponse } from "next/server";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { UPLOADS_DIR } from "@/lib/uploads";

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
    await unlink(path.join(UPLOADS_DIR, groupId, filename)).catch(() => {});
  }

  await prisma.groupPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true });
}
