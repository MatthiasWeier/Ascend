"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotificationToggle() {
  // null = still checking / not supported / not configured (renders nothing)
  const [available, setAvailable] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    fetch("/api/push/config")
      .then((r) => r.json())
      .then(async (data: { configured: boolean; publicKey: string | null }) => {
        if (!data.configured || !data.publicKey) return;
        setPublicKey(data.publicKey);
        setAvailable(true);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        setEnabled(!!subscription);
      });
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        if (Notification.permission === "denied") {
          toast.error("Benachrichtigungen sind im Browser blockiert.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Ohne Erlaubnis keine Benachrichtigungen.");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!) as BufferSource,
        });
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!res.ok) throw new Error();
        setEnabled(true);
        toast.success("Push-Benachrichtigungen an.");
      } else {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setEnabled(false);
        toast("Push-Benachrichtigungen aus.");
      }
    } catch {
      toast.error("Konnte Push-Einstellung nicht ändern.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label>Push-Benachrichtigungen</Label>
        <p className="text-xs text-muted-foreground">
          Erhalte eine Benachrichtigung, wenn jemand in deinen Gruppen ein Workout postet oder
          eine Challenge schafft.
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} disabled={busy} />
    </div>
  );
}
