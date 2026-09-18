import { prisma } from "@/lib/prisma";

// Always re-checks against the database rather than trusting the session's
// isAdmin claim - that claim is only set at login time (JWT session), so a
// just-promoted/demoted admin wouldn't see it change until they log in
// again. Fine for UI nav visibility, not fine for actually gating an
// admin-only action.
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ?? false;
}
