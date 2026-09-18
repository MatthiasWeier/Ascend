import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, envInt } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Nur Buchstaben, Zahlen, _ . -"),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterSec } = rateLimit(
    `register:${ip}`,
    envInt("REGISTER_RATE_LIMIT_MAX", 5),
    envInt("REGISTER_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000)
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Zu viele Registrierungen. Versuch's später nochmal." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, username, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, username, passwordHash },
    select: { id: true, username: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
