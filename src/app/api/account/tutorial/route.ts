import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The first-run tutorial was finished, skipped or closed. Idempotent: the
// first timestamp is kept, replaying it from Settings doesn't change it.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.updateMany({
    where: { id: session.user.id, tutorialCompletedAt: null },
    data: { tutorialCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
