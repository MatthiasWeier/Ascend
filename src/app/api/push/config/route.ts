import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isPushConfigured();
  return NextResponse.json({
    configured,
    publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null,
  });
}
