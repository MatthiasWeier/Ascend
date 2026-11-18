import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// NextAuth's own JWT default maxAge - a session past this is dead weight
// even without an explicit revoke, so it's pruned here as a cheap lazy
// cleanup rather than needing a cron job.
const JWT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userSession.deleteMany({
    where: { userId: session.user.id, createdAt: { lt: new Date(Date.now() - JWT_MAX_AGE_MS) } },
  });

  const sessions = await prisma.userSession.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true },
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({ ...s, isCurrent: s.id === session.sid })),
  });
}

// "End all other sessions" - keeps the current device signed in,
// revokes every other tracked session for this account.
export async function DELETE() {
  const session = await auth();
  if (!session?.user || !session.sid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userSession.deleteMany({
    where: { userId: session.user.id, id: { not: session.sid } },
  });

  return NextResponse.json({ ok: true });
}
