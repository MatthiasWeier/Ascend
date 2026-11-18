import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, totpAuthUri } from "@/lib/totp";

// Generates a fresh, unconfirmed secret and stores it - it has zero
// effect on login until /verify confirms the user can actually generate
// a code with it and flips totpEnabled to true. Calling this again before
// confirming just replaces the pending secret (e.g. retrying after the
// QR didn't scan).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { username: true, totpEnabled: true },
  });
  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: session.user.id }, data: { totpSecret: secret } });

  const uri = totpAuthUri(secret, user.username);
  const qrCodeDataUri = await QRCode.toDataURL(uri);

  return NextResponse.json({ secret, otpauthUri: uri, qrCodeDataUri });
}
