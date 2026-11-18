import { prisma } from "@/lib/prisma";
import { matchTotpCounter } from "@/lib/totp";

// Verifies a TOTP code AND atomically rejects replaying the same (or an
// older) code within its still-valid window - matchTotpCounter alone would
// happily accept the same 6 digits twice in a row. The conditional update
// (only writes if the new counter is strictly greater, or there's no
// history yet) makes the check-then-consume step race-safe under
// concurrent requests with the same code, without needing a transaction.
export async function verifyAndConsumeTotp(userId: string, secret: string, token: string): Promise<boolean> {
  const counter = matchTotpCounter(secret, token);
  if (counter == null) return false;

  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ totpLastUsedCounter: null }, { totpLastUsedCounter: { lt: counter } }],
    },
    data: { totpLastUsedCounter: counter },
  });
  return count === 1;
}
