import { NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/lib/auth";
import { storageReadFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // No path separators allowed at all - blocks traversal via a filename
  // like "../../secret" regardless of storage backend.
  if (filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await storageReadFile(`avatars/${filename}`);
  if (!bytes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
