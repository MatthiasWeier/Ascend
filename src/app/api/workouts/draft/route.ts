import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePhotoFiles } from "@/lib/workout-photos";

export const dynamic = "force-dynamic";

const MAX_BYTES = 200_000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// The unsaved "log workout" form. One draft per user; the client sends its
// whole form snapshot (rows, notes, ratings, photo ids) and the server just
// stores it. POST is an alias for PUT because navigator.sendBeacon (used
// when the tab goes to the background) can only POST.
async function save(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const text = await request.text();
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "Entwurf zu groß" }, { status: 413 });
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.workoutDraft.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data: data as Prisma.InputJsonValue },
    update: { data: data as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}

export const PUT = save;
export const POST = save;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Lazy cleanup: abandoned drafts and their never-attached photos.
  const cutoff = new Date(Date.now() - STALE_MS);
  await prisma.workoutDraft.deleteMany({ where: { userId, updatedAt: { lt: cutoff } } });
  const stale = await prisma.workoutPhoto.findMany({
    where: { userId, sessionId: null, createdAt: { lt: cutoff } },
  });
  if (stale.length > 0) {
    await prisma.workoutPhoto.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
    await deletePhotoFiles(stale);
  }

  const draft = await prisma.workoutDraft.findUnique({ where: { userId } });
  if (!draft) return NextResponse.json({ draft: null });

  // Only hand back photo ids that still exist as unattached photos of this user.
  const data = draft.data as { photoIds?: string[] } & Record<string, unknown>;
  if (Array.isArray(data.photoIds) && data.photoIds.length > 0) {
    const alive = await prisma.workoutPhoto.findMany({
      where: { userId, sessionId: null, id: { in: data.photoIds } },
      select: { id: true },
    });
    const aliveIds = new Set(alive.map((p) => p.id));
    data.photoIds = data.photoIds.filter((id) => aliveIds.has(id));
  }
  return NextResponse.json({ draft: { data, updatedAt: draft.updatedAt } });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.workoutDraft.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
