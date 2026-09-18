import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "ascend_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, prefix: raw.slice(0, KEY_PREFIX.length + 8) };
}

// Resolves an `Authorization: Bearer <key>` header to a userId for the
// /api/v1/* routes - the same idea as a session cookie, but for scripts
// that can't do a browser login. Best-effort updates lastUsedAt (never
// blocks the request on it).
export async function authenticateApiKey(request: Request): Promise<{ userId: string } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const raw = header.slice("Bearer ".length).trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const hash = createHash("sha256").update(raw).digest("hex");
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash }, select: { id: true, userId: true } });
  if (!key) return null;

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: key.userId };
}
