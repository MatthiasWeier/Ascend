import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayGermanDateKey } from "@/lib/german-time";

const bodySchema = z.object({ painLevel: z.number().int().min(1).max(10) });

// Today's "immer noch verletzt?" answer for one injury. One per injury per
// Berlin day - resubmitting the same day overwrites it.
export async function POST(request: Request, { params }: { params: Promise<{ injuryId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { injuryId } = await params;
  const injury = await prisma.injury.findUnique({ where: { id: injuryId } });
  if (!injury || injury.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const dateKey = todayGermanDateKey();

  const checkin = await prisma.injuryCheckin.upsert({
    where: { injuryId_dateKey: { injuryId, dateKey } },
    create: { injuryId, dateKey, painLevel: parsed.data.painLevel },
    update: { painLevel: parsed.data.painLevel },
  });
  return NextResponse.json({ checkin }, { status: 201 });
}
