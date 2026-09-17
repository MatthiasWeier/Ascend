import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const batchSchema = z.object({
  date: z.string(), // YYYY-MM-DD (German calendar day being logged)
  style: z.enum(["BOULDER", "ROUTE"]),
  entries: z.array(z.object({ grade: z.string().min(1).max(20), count: z.number().int().positive().max(500) })).min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = new Date(parsed.data.date);

  const sends = await prisma.climbingSend.createManyAndReturn({
    data: parsed.data.entries.map((e) => ({
      userId: session.user.id,
      style: parsed.data.style,
      grade: e.grade,
      count: e.count,
      date,
    })),
  });

  return NextResponse.json({ sends }, { status: 201 });
}
