import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/group-auth";
import { UPLOADS_DIR, extensionForImageType } from "@/lib/uploads";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const textPostSchema = z.object({
  type: z.enum(["TEXT", "WORKOUT_SHARE"]),
  content: z.string().min(1).max(2000),
});

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
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ posts });
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
  const parsed = textPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const post = await prisma.groupPost.create({
    data: { groupId, userId: session.user.id, type: parsed.data.type, content: parsed.data.content },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ post }, { status: 201 });
}
