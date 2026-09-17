import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  style: z.enum(["BOULDER", "ROUTE"]),
  grade: z.string().min(1).max(20),
  attempts: z.number().int().positive().default(1),
});

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

  const send = await prisma.climbingSend.create({
    data: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ send }, { status: 201 });
}
