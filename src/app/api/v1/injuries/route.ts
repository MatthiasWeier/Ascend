import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getActiveInjuries } from "@/lib/injuries-server";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const injuries = await getActiveInjuries(auth.userId);
  return NextResponse.json({ injuries });
}
