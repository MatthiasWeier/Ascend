import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey, requireWriteAccess } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { germanDateKey } from "@/lib/german-time";
import { shareClimbingDay } from "@/lib/climbing-day";

const sendSchema = z.object({
  style: z.enum(["BOULDER", "ROUTE"]),
  grade: z.string().min(1).max(20),
  attempts: z.number().int().positive().default(1),
  count: z.number().int().positive().max(500).default(1),
  date: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const sends = await prisma.climbingSend.findMany({
    where: { userId: auth.userId },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json({ sends });
}

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forbidden = requireWriteAccess(auth);
  if (forbidden) return forbidden;

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;
  const send = await prisma.climbingSend.create({
    data: { userId: auth.userId, ...rest, ...(date ? { date: new Date(date) } : {}) },
  });

  await shareClimbingDay(auth.userId, germanDateKey(send.date));

  return NextResponse.json({ send }, { status: 201 });
}
