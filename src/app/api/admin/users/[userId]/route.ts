import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

const patchSchema = z.object({
  isAdmin: z.boolean().optional(),
  // Recovery path for a locked-out user - there's no email-based account
  // recovery in this app at all, so this is the only way back in if
  // someone loses both their authenticator and their backup codes.
  disableTotp: z.literal(true).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.disableTotp) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } }),
      prisma.totpBackupCode.deleteMany({ where: { userId } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.isAdmin === undefined) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Never let the last admin demote themselves (or be demoted) - that
  // would lock everyone out of /dashboard/admin with no way back in short
  // of a direct database edit.
  if (!parsed.data.isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (target?.isAdmin && adminCount <= 1) {
      return NextResponse.json({ error: "Der letzte Admin kann nicht entfernt werden" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: parsed.data.isAdmin },
    select: { id: true, username: true, isAdmin: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Nutze die Konto-Löschung in den Einstellungen für dein eigenes Konto" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
