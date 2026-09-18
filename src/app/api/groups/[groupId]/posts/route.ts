import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { UPLOADS_DIR, extensionForImageType } from "@/lib/uploads";
import { summarizeWorkoutSession } from "@/lib/workout-summary";
import { sendPushToUsers } from "@/lib/push";

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
      reactions: { select: { userId: true, emoji: true } },
    },
  });

  const shaped = posts.map((post) => {
    const counts: Record<string, number> = {};
    let myEmoji: string | null = null;
    for (const r of post.reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (r.userId === session.user.id) myEmoji = r.emoji;
    }
    const { reactions: _reactions, ...rest } = post;
    return { ...rest, reactionCounts: counts, myReaction: myEmoji };
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

    const dir = path.join(UPLOADS_DIR, groupId);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(/* turbopackIgnore: true */ dir, filename), bytes);

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
    sendPushToUsers(
      otherMembers.map((m) => m.userId),
      { title: group?.name ?? "Ascend", body: `${post.user.name} hat ein Workout gepostet`, url: "/dashboard" }
    ).catch(() => {});
  }

  return NextResponse.json({ post }, { status: 201 });
}
