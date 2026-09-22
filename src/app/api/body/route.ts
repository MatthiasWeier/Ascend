import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBodyData, BODY_WINDOWS } from "@/lib/body-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = BODY_WINDOWS.includes(requested) ? requested : 14;

  return NextResponse.json(await getBodyData(session.user.id, days));
}
