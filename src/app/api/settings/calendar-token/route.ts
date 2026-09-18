import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateToken() {
  return randomBytes(24).toString("hex");
}

// Lazily creates the token on first read - most users never open this
// section of Settings, no need to generate one at signup.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarToken: true },
  });
  if (!user?.calendarToken) {
    const token = generateToken();
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarToken: token },
      select: { calendarToken: true },
    });
  }

  return NextResponse.json({ token: user.calendarToken });
}

// Rotates the token - invalidates any calendar app that already
// subscribed with the old URL, for when a link leaked or you just want a
// fresh one.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = generateToken();
  await prisma.user.update({ where: { id: session.user.id }, data: { calendarToken: token } });

  return NextResponse.json({ token });
}
