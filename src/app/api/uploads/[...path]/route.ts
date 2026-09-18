import { NextResponse } from "next/server";
import path from "node:path";
import { auth } from "@/lib/auth";
import { storageReadFile } from "@/lib/storage";
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

  // No ".." segments allowed at all - blocks traversal regardless of
  // storage backend.
  if (segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await storageReadFile(segments.join("/"));
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
