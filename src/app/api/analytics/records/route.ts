import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentPRs } from "@/lib/personal-records";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await getCurrentPRs(session.user.id);
  return NextResponse.json({ records });
}
