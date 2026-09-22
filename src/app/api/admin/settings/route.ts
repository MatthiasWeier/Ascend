import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-auth";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";

const patchSchema = z.object({
  rateLimitingEnabled: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getAppSettings();
  return NextResponse.json({
    rateLimitingEnabled: settings.rateLimitingEnabled,
    registrationOpen: settings.registrationOpen,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const settings = await updateAppSettings(parsed.data);
  return NextResponse.json({
    rateLimitingEnabled: settings.rateLimitingEnabled,
    registrationOpen: settings.registrationOpen,
  });
}
