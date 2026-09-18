import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  exerciseIds: z.array(z.string()).min(1).max(30),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.workoutTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { entries: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      entries: {
        create: parsed.data.exerciseIds.map((exerciseId, index) => ({ exerciseId, order: index })),
      },
    },
    include: { entries: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ template }, { status: 201 });
}
