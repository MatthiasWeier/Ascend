import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// No auth - meant for Docker/reverse-proxy healthchecks and uptime
// monitors, not for humans. Confirms the app can actually reach the
// database, not just that the Node process is alive.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
