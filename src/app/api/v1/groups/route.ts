import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: auth.userId },
    select: { role: true, group: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    groups: memberships.map((m) => ({ id: m.group.id, name: m.group.name, role: m.role })),
  });
}
