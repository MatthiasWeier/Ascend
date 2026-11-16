import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.musclePreference.findMany({
    where: { userId: auth.userId },
    select: { muscle: true, wish: true },
  });
  return NextResponse.json({ preferences });
}
