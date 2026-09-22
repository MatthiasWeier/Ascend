import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Nur Buchstaben, Zahlen, _ . -"),
  password: z.string().min(8).max(200),
  inviteCode: z.string().optional(),
});

// Lets the register page know whether to require an invite code, without
// exposing anything else - see INVITE_ONLY in .env.example.
export async function GET() {
  return NextResponse.json({ inviteOnly: process.env.INVITE_ONLY === "true" });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, username, password, inviteCode } = parsed.data;

  // With INVITE_ONLY set, signing up requires a real invite code - closes
  // the instance to the public while still letting the operator's friends
  // in via a group invite link.
  let inviteGroupId: string | null = null;
  if (inviteCode) {
    const group = await prisma.group.findUnique({ where: { inviteCode }, select: { id: true } });
    inviteGroupId = group?.id ?? null;
  }
  if (process.env.INVITE_ONLY === "true" && !inviteGroupId) {
    return NextResponse.json(
      { error: "Registrierung ist nur mit einem gültigen Einladungslink möglich" },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      // Signing up via an invite link joins that group in the same step -
      // no separate "now click the link again" round trip.
      groupMemberships: inviteGroupId
        ? { create: { groupId: inviteGroupId, role: "MEMBER" } }
        : undefined,
    },
    select: { id: true, username: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
