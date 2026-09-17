import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { germanDateKey } from "@/lib/german-time";

const sendSchema = z.object({
  style: z.enum(["BOULDER", "ROUTE"]),
  grade: z.string().min(1).max(20),
  attempts: z.number().int().positive().default(1),
  count: z.number().int().positive().max(500).default(1),
  date: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1); // 1-12

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const sends = await prisma.climbingSend.findMany({
    where: { userId: session.user.id, date: { gte: start, lt: end } },
    select: { date: true },
  });

  const markedDays = Array.from(new Set(sends.map((s) => germanDateKey(s.date))));

  return NextResponse.json({ markedDays });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;

  const send = await prisma.climbingSend.create({
    data: { userId: session.user.id, ...rest, ...(date ? { date: new Date(date) } : {}) },
  });

  return NextResponse.json({ send }, { status: 201 });
}
