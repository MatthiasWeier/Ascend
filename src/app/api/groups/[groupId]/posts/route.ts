import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { extensionForImageType } from "@/lib/uploads";
import { storageWriteFile } from "@/lib/storage";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { notifyUsers } from "@/lib/notify";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const postSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), content: z.string().min(1).max(2000) }),
  z.object({ type: z.literal("WORKOUT_SHARE"), workoutSessionId: z.string() }),
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;

  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const posts = await prisma.groupPost.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true } },
      reactions: { select: { userId: true, emoji: true, user: { select: { name: true } } } },
    },
  });

  const shareIds = posts.map((p) => p.workoutSessionId).filter((id): id is string => id != null);
  const focusRows = shareIds.length
    ? await prisma.workoutSet.findMany({
        where: { sessionId: { in: shareIds }, setType: { not: "WARMUP" } },
        select: { sessionId: true, exercise: { select: { focus: true } } },
      })
    : [];
  const focusesBySession = new Map<string, Set<string>>();
  for (const row of focusRows) {
    const set = focusesBySession.get(row.sessionId) ?? new Set<string>();
    set.add(row.exercise.focus);
    focusesBySession.set(row.sessionId, set);
  }

  const photoRows = shareIds.length
    ? await prisma.workoutPhoto.findMany({
        where: { sessionId: { in: shareIds } },
        orderBy: { createdAt: "asc" },
        select: { id: true, sessionId: true },
      })
    : [];
  const photosBySession = new Map<string, string[]>();
  for (const row of photoRows) {
    if (!row.sessionId) continue;
    photosBySession.set(row.sessionId, [...(photosBySession.get(row.sessionId) ?? []), row.id]);
  }

  const commentCountRows = await prisma.postComment.groupBy({
    by: ["postId"],
    where: { postId: { in: posts.map((p) => p.id) }, deletedAt: null },
    _count: { _all: true },
  });
  const commentCounts = new Map(commentCountRows.map((r) => [r.postId, r._count._all]));

  const shaped = posts.map((post) => {
    const counts: Record<string, number> = {};
    const users: Record<string, string[]> = {};
    let myEmoji: string | null = null;
    for (const r of post.reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      (users[r.emoji] ??= []).push(r.user.name);
      if (r.userId === session.user.id) myEmoji = r.emoji;
    }
    const { reactions: _reactions, ...rest } = post;
    return {
      ...rest,
      reactionCounts: counts,
      reactionUsers: users,
      myReaction: myEmoji,
      focuses: Array.from(focusesBySession.get(post.workoutSessionId ?? "") ?? []),
      commentCount: commentCounts.get(post.id) ?? 0,
      photoIds: photosBySession.get(post.workoutSessionId ?? "") ?? [],
    };
  });

  return NextResponse.json({ posts: shaped });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;

  const membership = await getGroupMembership(session.user.id, groupId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("image");
    const caption = form.get("caption");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Kein Bild übermittelt" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Bild zu groß (max. 8MB)" }, { status: 400 });
    }
    const ext = extensionForImageType(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Nicht unterstütztes Bildformat" }, { status: 400 });
    }

    const filename = `${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await storageWriteFile(`${groupId}/${filename}`, bytes);

    const post = await prisma.groupPost.create({
      data: {
        groupId,
        userId: session.user.id,
        type: "PHOTO",
        imageUrl: `/api/uploads/${groupId}/${filename}`,
        content: typeof caption === "string" && caption.length > 0 ? caption : null,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ post }, { status: 201 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.type === "TEXT") {
    const post = await prisma.groupPost.create({
      data: { groupId, userId: session.user.id, type: "TEXT", content: parsed.data.content },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ post }, { status: 201 });
  }

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: parsed.data.workoutSessionId },
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  if (!workoutSession || workoutSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Workout nicht gefunden" }, { status: 404 });
  }

  const alreadyShared = await prisma.groupPost.findUnique({
    where: { groupId_workoutSessionId: { groupId, workoutSessionId: workoutSession.id } },
  });
  if (alreadyShared) {
    return NextResponse.json({ error: "Workout wurde bereits geteilt" }, { status: 409 });
  }

  const post = await prisma.groupPost.create({
    data: {
      groupId,
      userId: session.user.id,
      type: "WORKOUT_SHARE",
      content: summarizeWorkoutSession(workoutSession),
      workoutSessionId: workoutSession.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  const otherMembers = await prisma.groupMember.findMany({
    where: { groupId, userId: { not: session.user.id } },
    select: { userId: true },
  });
  if (otherMembers.length > 0) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    notifyUsers(otherMembers.map((m) => m.userId), {
      type: "WORKOUT_POST",
      actorId: session.user.id,
      actorName: post.user.name,
      groupName: group?.name ?? "",
      url: `/dashboard/groups/${groupId}`,
      pushTitle: group?.name ?? "Ascend",
      pushBody: `${post.user.name} hat ein Workout gepostet`,
    }).catch(() => {});
  }

  return NextResponse.json({ post }, { status: 201 });
}
