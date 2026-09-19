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

export type PushTestResult = { host: string; ok: boolean; statusCode?: number; detail?: string };

// Sends a test notification to one user's own devices and reports exactly
// what the push service answered - used by the Settings diagnostics so a
// "push doesn't work" report has a concrete error to look at.
export async function sendTestPush(userId: string): Promise<PushTestResult[]> {
  if (!isPushConfigured()) return [];
  configureWebPush();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  return Promise.all(
    subscriptions.map(async (sub): Promise<PushTestResult> => {
      const host = new URL(sub.endpoint).host;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Ascend", body: "Test-Benachrichtigung ✓", url: "/dashboard/settings" }),
          { TTL: 60 * 60, urgency: "high" }
        );
        return { host, ok: true };
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string };
        logger.warn("Push test failed", { host, statusCode: e.statusCode, body: e.body });
        if (e.statusCode === 404 || e.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        return { host, ok: false, statusCode: e.statusCode, detail: (e.body || e.message || "").slice(0, 200) };
      }
    })
  );
}

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
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "high" }
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
