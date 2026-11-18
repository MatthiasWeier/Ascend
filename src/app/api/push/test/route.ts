import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPushConfigured, sendTestPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push isn't set up on the server." }, { status: 400 });
  }
  return NextResponse.json({ results: await sendTestPush(session.user.id) });
}
