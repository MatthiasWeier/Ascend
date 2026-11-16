import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getCurrentPRs } from "@/lib/personal-records";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await getCurrentPRs(auth.userId);
  return NextResponse.json({ records });
}
