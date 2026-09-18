import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { keyId } = await params;

  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!key || key.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id: keyId } });

  return NextResponse.json({ ok: true });
}
