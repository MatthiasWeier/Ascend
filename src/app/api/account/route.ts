import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withErrorLogging } from "@/lib/api-handler";

const deleteSchema = z.object({ password: z.string().min(1) });

// Deletes the account and, via the schema's onDelete rules, everything
// that only makes sense tied to this user: their workouts, bodyweight log,
// climbing sends, balance goals, group memberships, challenge goals/votes -
// and any groups they OWN (owning a group cascades to the group itself,
// since there's no ownership-transfer feature; the confirmation UI warns
// about this). Custom exercises they created are kept (orphaned to
// createdById: null) since group-mates may still use them.
export const DELETE = withErrorLogging("DELETE /api/account", async (request) => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Passwort erforderlich" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  logger.info("Account deleted", { userId: session.user.id, username: user.username });

  return NextResponse.json({ ok: true });
});
