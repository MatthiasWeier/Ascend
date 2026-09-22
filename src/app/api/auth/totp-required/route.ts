import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, envInt } from "@/lib/rate-limit";

const bodySchema = z.object({ username: z.string() });

// Public, unauthenticated - lets the login form know whether to show the
// TOTP field before attempting sign-in. Whether a given username has 2FA
// on is a minor, low-value leak for a small self-hosted friend-group app
// (not a public multi-tenant SaaS); rate-limited the same as login so it
// can't be used as a fast enumeration probe either way.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ required: false });
  }

  const { allowed } = await checkRateLimit(
    `totp-check:${parsed.data.username.toLowerCase()}`,
    envInt("LOGIN_RATE_LIMIT_MAX", 10),
    envInt("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000)
  );
  if (!allowed) {
    return NextResponse.json({ required: false });
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { totpEnabled: true },
  });

  return NextResponse.json({ required: user?.totpEnabled ?? false });
}
