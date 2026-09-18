import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeeklySetCounts } from "@/lib/weekly-sets";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getWeeklySetCounts(session.user.id);
  return NextResponse.json({ data });
}
