import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BODY_PARTS, SEVERITIES } from "@/lib/injuries";
import { getActiveInjuries } from "@/lib/injuries-server";

export const dynamic = "force-dynamic";

const MAX_ACTIVE = 12;

const createSchema = z.object({
  bodyPart: z.enum(BODY_PARTS as [string, ...string[]]),
  severity: z.enum(SEVERITIES as [string, ...string[]]),
  note: z.string().max(200).optional(),
  // YYYY-MM-DD: expected to be healed by then; the injury stops counting afterwards.
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ injuries: await getActiveInjuries(session.user.id) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const userId = session.user.id;

  const active = await getActiveInjuries(userId);
  if (active.length >= MAX_ACTIVE) {
    return NextResponse.json({ error: "Zu viele aktive Verletzungen" }, { status: 400 });
  }
  // One entry per body part: adding it again replaces severity/end date.
  const existing = active.find((i) => i.bodyPart === parsed.data.bodyPart);
  const data = {
    severity: parsed.data.severity as (typeof SEVERITIES)[number],
    note: parsed.data.note?.trim() || null,
    endsAt: parsed.data.endsAt ? new Date(`${parsed.data.endsAt}T23:59:59.000Z`) : null,
  };
  const injury = existing
    ? await prisma.injury.update({ where: { id: existing.id }, data })
    : await prisma.injury.create({
        data: { userId, bodyPart: parsed.data.bodyPart as (typeof BODY_PARTS)[number], ...data },
      });
  return NextResponse.json({ injury }, { status: 201 });
}
