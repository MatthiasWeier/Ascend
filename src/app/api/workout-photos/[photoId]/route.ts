import { NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageReadFile } from "@/lib/storage";
import { deletePhotoFiles, photoPath } from "@/lib/workout-photos";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Visible to the owner, and - once attached - to members of any group this
// workout was shared into (same audience as the shared workout post).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { photoId } = await params;
  const photo = await prisma.workoutPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const isOwner = photo.userId === session.user.id;
  if (!isOwner) {
    const sharedWithMe = photo.sessionId
      ? await prisma.groupPost.findFirst({
          where: {
            workoutSessionId: photo.sessionId,
            type: "WORKOUT_SHARE",
            group: { members: { some: { userId: session.user.id } } },
          },
          select: { id: true },
        })
      : null;
    if (!sharedWithMe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const bytes = await storageReadFile(photoPath(photo.userId, photo.filename));
  const contentType = CONTENT_TYPES[path.extname(photo.filename).toLowerCase()];
  if (!bytes || !contentType) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { photoId } = await params;
  const photo = await prisma.workoutPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.userId !== session.user.id) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await prisma.workoutPhoto.delete({ where: { id: photoId } });
  await deletePhotoFiles([photo]);
  return NextResponse.json({ ok: true });
}
