import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { DATE_KEY_RE } from "@/lib/climbing-meetups";
import { todayGermanDateKey } from "@/lib/german-time";

const bodySchema = z.object({
  weightKg: z.number().positive(),
  date: z.string().regex(DATE_KEY_RE).optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 200);

  const entries = await prisma.bodyWeightEntry.findMany({
    where: { userId: auth.userId },
    orderBy: { dateKey: "desc" },
    take: limit,
  });

  return NextResponse.json({ entries });
}

// Upsert, like the regular bodyweight widget - one entry per day, logging
// again the same day corrects it rather than creating a second row. Handy
// for a smart-scale integration pushing a daily reading in from outside.
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dateKey = parsed.data.date ?? todayGermanDateKey();
  const entry = await prisma.bodyWeightEntry.upsert({
    where: { userId_dateKey: { userId: auth.userId, dateKey } },
    update: { weightKg: parsed.data.weightKg },
    create: { userId: auth.userId, dateKey, weightKg: parsed.data.weightKg },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
