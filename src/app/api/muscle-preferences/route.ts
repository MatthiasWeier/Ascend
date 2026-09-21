import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_MUSCLES } from "@/lib/muscles";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  muscle: z.enum(ALL_MUSCLES as [string, ...string[]]),
  // 0 = fine as it is (removes the wish), 1 = more, 2 = much more
  wish: z.number().int().min(0).max(2),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preferences = await prisma.musclePreference.findMany({
    where: { userId: session.user.id },
    select: { muscle: true, wish: true },
  });
  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = putSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const userId = session.user.id;
  const muscle = parsed.data.muscle as (typeof ALL_MUSCLES)[number];

  if (parsed.data.wish === 0) {
    await prisma.musclePreference.deleteMany({ where: { userId, muscle } });
  } else {
    await prisma.musclePreference.upsert({
      where: { userId_muscle: { userId, muscle } },
      create: { userId, muscle, wish: parsed.data.wish },
      update: { wish: parsed.data.wish },
    });
  }
  return NextResponse.json({ ok: true });
}
