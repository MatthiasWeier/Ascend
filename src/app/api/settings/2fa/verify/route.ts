import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";
import { issueBackupCodes } from "@/lib/totp-backup-codes";

const bodySchema = z.object({ token: z.string().min(6).max(6) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte einen 6-stelligen Code eingeben" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA ist bereits aktiviert" }, { status: 400 });
  }
  if (!user.totpSecret || !verifyTotpToken(user.totpSecret, parsed.data.token)) {
    return NextResponse.json({ error: "Code ist falsch oder abgelaufen" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { totpEnabled: true } });
  const backupCodes = await issueBackupCodes(session.user.id);

  return NextResponse.json({ ok: true, backupCodes });
}
