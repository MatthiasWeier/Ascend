import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ password: z.string().min(1) });

// Requires re-entering the password - disabling 2FA is a security
// downgrade, so a hijacked-but-still-logged-in session shouldn't be able
// to turn it off without proving the password again.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Password is wrong" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { totpEnabled: false, totpSecret: null },
    }),
    prisma.totpBackupCode.deleteMany({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
