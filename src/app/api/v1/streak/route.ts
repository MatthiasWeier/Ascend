import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { computeCurrentStreak } from "@/lib/streak";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const streak = await computeCurrentStreak(auth.userId);
  return NextResponse.json({ streak });
}
