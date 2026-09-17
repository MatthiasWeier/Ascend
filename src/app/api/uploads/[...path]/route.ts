import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/uploads";
import { getGroupMembership } from "@/lib/group-auth";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await params;
  const [groupId] = segments;
  const membership = groupId ? await getGroupMembership(session.user.id, groupId) : null;
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Resolve and verify the path stays inside UPLOADS_DIR - blocks traversal
  // via segments like "..".
  const resolved = path.resolve(UPLOADS_DIR, ...segments);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
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
