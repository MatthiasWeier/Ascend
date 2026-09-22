import { prisma } from "@/lib/prisma";

// Single-row table, seeded by its migration - always exists, so this is
// a plain read, not a get-or-create.
const SETTINGS_ID = "global";

export async function getAppSettings() {
  return prisma.appSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
}

export async function updateAppSettings(data: { rateLimitingEnabled?: boolean; registrationOpen?: boolean }) {
  return prisma.appSettings.update({ where: { id: SETTINGS_ID }, data });
}
