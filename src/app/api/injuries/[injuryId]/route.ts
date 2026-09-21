import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findOwn(injuryId: string, userId: string) {
  const injury = await prisma.injury.findUnique({ where: { id: injuryId } });
  return injury && injury.userId === userId ? injury : null;
}

// Mark as healed: it stops affecting suggestions and warnings.
export async function PATCH(_request: Request, { params }: { params: Promise<{ injuryId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { injuryId } = await params;
  if (!(await findOwn(injuryId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.injury.update({ where: { id: injuryId }, data: { resolvedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ injuryId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { injuryId } = await params;
  if (!(await findOwn(injuryId, session.user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.injury.delete({ where: { id: injuryId } });
  return NextResponse.json({ ok: true });
}
