import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, scope: true, createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json({ keys });
}

// New keys default to read-only - a key that only ever needs to read
// data (the common case: Home Assistant, a dashboard) shouldn't also be
// able to delete a workout if it leaks. Existing keys from before scopes
// existed stay READ_WRITE (see the migration), only new ones default
// safer.
const createSchema = z.object({
  name: z.string().min(1).max(60),
  scope: z.enum(["READ_ONLY", "READ_WRITE"]).default("READ_ONLY"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { raw, hash, prefix } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: { userId: session.user.id, name: parsed.data.name, keyHash: hash, keyPrefix: prefix, scope: parsed.data.scope },
    select: { id: true, name: true, keyPrefix: true, scope: true, createdAt: true },
  });

  // The only time the raw key is ever returned - only the hash is kept
  // after this response.
  return NextResponse.json({ key, rawKey: raw }, { status: 201 });
}
