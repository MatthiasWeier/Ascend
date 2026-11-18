import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiKeyScope } from "@prisma/client";

const KEY_PREFIX = "ascend_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, prefix: raw.slice(0, KEY_PREFIX.length + 8) };
}

export type ApiKeyAuth = { userId: string; scope: ApiKeyScope };

// Resolves an `Authorization: Bearer <key>` header to a userId+scope for
// the /api/v1/* routes - the same idea as a session cookie, but for
// scripts that can't do a browser login. Best-effort updates lastUsedAt
// (never blocks the request on it).
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuth | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const raw = header.slice("Bearer ".length).trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const hash = createHash("sha256").update(raw).digest("hex");
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash }, select: { id: true, userId: true, scope: true } });
  if (!key) return null;

  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: key.userId, scope: key.scope };
}

// A read-only key (the default for newly created keys - see
// Settings/api-keys) is only meant for GET/scripts that observe data, not
// write it. Every v1 route with a write method (POST/PATCH/DELETE) checks
// this right after authenticateApiKey, before touching the body/DB.
export function requireWriteAccess(auth: ApiKeyAuth): NextResponse | null {
  if (auth.scope === "READ_ONLY") {
    return NextResponse.json({ error: "Dieser API-Key ist nur lesend (read-only)" }, { status: 403 });
  }
  return null;
}
