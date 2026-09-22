import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extensionForImageType } from "@/lib/uploads";
import { storageWriteFile } from "@/lib/storage";
import { photoPath, MAX_PHOTOS_PER_WORKOUT } from "@/lib/workout-photos";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Uploads one pump pic, not yet attached to any workout (sessionId null) -
// it becomes part of a workout when the form is saved with its id.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
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

  const pending = await prisma.workoutPhoto.count({ where: { userId, sessionId: null } });
  if (pending >= MAX_PHOTOS_PER_WORKOUT + 2) {
    return NextResponse.json({ error: "Zu viele Fotos" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;
  await storageWriteFile(photoPath(userId, filename), Buffer.from(await file.arrayBuffer()));
  const photo = await prisma.workoutPhoto.create({ data: { userId, filename }, select: { id: true } });

  return NextResponse.json({ photo }, { status: 201 });
}
