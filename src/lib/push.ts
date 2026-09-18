import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Push is entirely optional self-hosting infra: if the operator never set
// VAPID keys, every function here just no-ops instead of throwing, and the
// Settings toggle stays hidden client-side.
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

type PushPayload = { title: string; body: string; url?: string };

// Fires a push to every device the given users have subscribed on. Best-
// effort: a single failed/expired subscription never blocks the others,
// and a 404/410 (browser unsubscribed or the subscription expired)
// deletes that row so we stop paying for it on every future call.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!isPushConfigured() || userIds.length === 0) return;
  configureWebPush();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          logger.warn("Push notification failed to send", { subscriptionId: sub.id, statusCode });
        }
      }
    })
  );
}
