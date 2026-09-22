import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPendingInjuryCheckins } from "@/lib/injuries-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ pending: await getPendingInjuryCheckins(session.user.id) });
}
