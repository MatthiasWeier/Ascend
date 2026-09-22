import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyUsers } from "@/lib/notify";

const createSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  parentId: z.string().optional(),
});

async function loadPost(groupId: string, postId: string) {
  const post = await prisma.groupPost.findUnique({ where: { id: postId } });
  return post && post.groupId === groupId ? post : null;
}

// Flat list, oldest first - the client builds the reply tree from parentId.
// Deleted comments that still have replies are kept as "[gelöscht]" stubs so
// the thread doesn't fall apart.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  if (!(await loadPost(groupId, postId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      content: c.deletedAt ? "" : c.content,
      deleted: c.deletedAt != null,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      user: c.deletedAt ? null : c.user,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId, postId } = await params;
  if (!(await getGroupMembership(session.user.id, groupId))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const post = await loadPost(groupId, postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { allowed } = await checkRateLimit(`comment:${session.user.id}`, 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Zu viele Kommentare - kurz warten." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let parentAuthorId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await prisma.postComment.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.postId !== postId || parent.deletedAt) {
      return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
    }
    parentAuthorId = parent.userId;
  }

  const comment = await prisma.postComment.create({
    data: {
      postId,
      userId: session.user.id,
      parentId: parsed.data.parentId ?? null,
      content: parsed.data.content,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // A reply notifies the parent comment's author; the post author gets a
  // "commented" entry unless they already got the reply one. Never blocks
  // or fails the comment itself.
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  const shared = {
    actorId: session.user.id,
    actorName: comment.user.name,
    groupName: group?.name ?? "",
    snippet: comment.content.slice(0, 120),
    url: `/dashboard/groups/${groupId}?tab=feed&post=${postId}&comment=${comment.id}`,
    pushTitle: group?.name ?? "Ascend",
  };
  if (parentAuthorId) {
    await notifyUsers([parentAuthorId], {
      ...shared,
      type: "REPLY",
      pushBody: `${comment.user.name} hat geantwortet: ${comment.content.slice(0, 80)}`,
    });
  }
  if (post.userId !== parentAuthorId) {
    await notifyUsers([post.userId], {
      ...shared,
      type: "COMMENT",
      pushBody: `${comment.user.name}: ${comment.content.slice(0, 80)}`,
    });
  }

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        parentId: comment.parentId,
        content: comment.content,
        deleted: false,
        createdAt: comment.createdAt,
        editedAt: null,
        user: comment.user,
      },
    },
    { status: 201 }
  );
}
