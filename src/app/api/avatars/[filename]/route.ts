import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // Resolve and verify the path stays inside AVATARS_DIR - blocks traversal
  // via a filename like "../../secret".
  const resolved = path.resolve(AVATARS_DIR, filename);
  if (!resolved.startsWith(AVATARS_DIR + path.sep)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await stat(resolved);
    const bytes = await readFile(resolved);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
