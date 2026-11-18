import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extensionForImageType } from "@/lib/uploads";
import { storageWriteFile } from "@/lib/storage";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image submitted" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Image too large (max. 4 MB)" }, { status: 400 });
  }
  const ext = extensionForImageType(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await storageWriteFile(`avatars/${filename}`, bytes);

  const avatarUrl = `/api/avatars/${filename}`;
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl }, { status: 201 });
}
