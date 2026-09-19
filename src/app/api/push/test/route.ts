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
    return NextResponse.json({ error: "Push ist auf dem Server nicht eingerichtet." }, { status: 400 });
  }
  return NextResponse.json({ results: await sendTestPush(session.user.id) });
}
