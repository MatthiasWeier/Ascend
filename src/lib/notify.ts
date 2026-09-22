import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export type NotificationType =
  | "COMMENT"
  | "REPLY"
  | "NUDGE"
  | "WORKOUT_POST"
  | "CHALLENGE_DONE"
  | "CLIMBING"
  | "CLIMBING_INVITE";

// Creates the in-app notification (the bell) and, on top, tries a web
// push. The in-app entry is the reliable part - push depends on the
// browser reaching its push service - so a failure in either never
// blocks or fails the action that triggered it.
export async function notifyUsers(
  recipientIds: string[],
  n: {
    type: NotificationType;
    actorId: string;
    actorName: string;
    groupName: string;
    snippet?: string;
    url: string;
    pushTitle: string;
    pushBody: string;
  }
): Promise<void> {
  const ids = Array.from(new Set(recipientIds)).filter((id) => id !== n.actorId);
  if (ids.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: n.type,
        actorName: n.actorName,
        groupName: n.groupName,
        snippet: n.snippet ?? null,
        url: n.url,
      })),
    });
  } catch (err) {
    logger.warn("Could not store notifications", { type: n.type, error: String(err) });
  }

  sendPushToUsers(ids, { title: n.pushTitle, body: n.pushBody, url: n.url }).catch(() => {});
}
