import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueBackupCodes } from "@/lib/totp-backup-codes";

const bodySchema = z.object({ password: z.string().min(1) });

// Regenerating invalidates every previous code - same password
// re-confirmation as disabling 2FA, since it's also a way to lock out
// someone else who's stolen your old codes.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Passwort erforderlich" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { passwordHash: true, totpEnabled: true },
  });
  if (!user.totpEnabled) {
    return NextResponse.json({ error: "2FA ist nicht aktiviert" }, { status: 400 });
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Passwort ist falsch" }, { status: 400 });
  }

  const backupCodes = await issueBackupCodes(session.user.id);
  return NextResponse.json({ ok: true, backupCodes });
}
