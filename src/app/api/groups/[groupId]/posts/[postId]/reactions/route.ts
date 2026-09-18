import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { REACTION_EMOJIS } from "@/lib/post-reactions";

const reactSchema = z.object({ emoji: z.enum(REACTION_EMOJIS) });

async function findGroupPost(groupId: string, postId: string) {
  const post = await prisma.groupPost.findUnique({ where: { id: postId } });
  if (!post || post.groupId !== groupId) return null;
  return post;
}

// One reaction per user per post - POST upserts (picking a different
// emoji just replaces the old one), DELETE clears it.
export async function POST(
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

  const post = await findGroupPost(groupId, postId);
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = reactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.postReaction.upsert({
    where: { postId_userId: { postId, userId: session.user.id } },
    update: { emoji: parsed.data.emoji },
    create: { postId, userId: session.user.id, emoji: parsed.data.emoji },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

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

  await prisma.postReaction.deleteMany({ where: { postId, userId: session.user.id } });

  return NextResponse.json({ ok: true });
}
