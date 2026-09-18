import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// Human-typeable (no 0/O/1/I ambiguity), formatted XXXX-XXXX for
// readability. Hashed with plain SHA-256 like ApiKey.keyHash - these are
// high-entropy random codes, not low-entropy secrets that need bcrypt.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_COUNT = 10;

function randomCode(): string {
  const bytes = crypto.randomBytes(8);
  let raw = "";
  for (const byte of bytes) {
    raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

// Deletes any existing codes and issues a fresh set of 10 - called both
// when 2FA is first enabled and on manual regeneration. Returns the
// plaintext codes, shown exactly once.
export async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, randomCode);
  await prisma.$transaction([
    prisma.totpBackupCode.deleteMany({ where: { userId } }),
    prisma.totpBackupCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashCode(code) })),
    }),
  ]);
  return codes;
}

// Consumes a backup code if it's valid and unused - single-use, so a
// stolen/leaked code (e.g. from a compromised password manager entry)
// can't be replayed. Returns whether it matched.
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const clean = code.trim();
  if (!clean) return false;
  const hash = hashCode(clean);
  const match = await prisma.totpBackupCode.findFirst({
    where: { userId, codeHash: hash, usedAt: null },
  });
  if (!match) return false;
  await prisma.totpBackupCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
  return true;
}
