import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RETENTION_MS = 60 * 24 * 60 * 60 * 1000;

// ?count=1 is the cheap poll the bell does every minute; without it the
// list itself comes back (newest first).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });
  if (new URL(request.url).searchParams.get("count")) {
    return NextResponse.json({ unreadCount });
  }

  // Lazy cleanup instead of a cron job.
  await prisma.notification.deleteMany({
    where: { userId, createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications, unreadCount });
}

const readSchema = z.object({ ids: z.array(z.string()).max(100).optional() });

// Without ids: mark everything read.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = readSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      ...(parsed.data.ids ? { id: { in: parsed.data.ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
