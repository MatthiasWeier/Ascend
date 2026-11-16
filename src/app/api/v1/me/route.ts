import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      weightUnit: true,
      bodyWeightKg: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
