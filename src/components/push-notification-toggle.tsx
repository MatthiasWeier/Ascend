"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/locale-provider";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotificationToggle() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setUnavailableReason(t("Push wird von diesem Browser nicht unterstützt."));
      setChecked(true);
      return;
    }

    fetch("/api/push/config")
      .then((r) => r.json())
      .then(async (data: { configured?: boolean; publicKey?: string | null; error?: string }) => {
        if (data.error) {
          setUnavailableReason(t("Push-Konfiguration konnte nicht geladen werden ({error}).", { error: data.error }));
          return;
        }
        if (!data.configured || !data.publicKey) {
          setUnavailableReason(t("Push ist auf dem Server nicht eingerichtet."));
          return;
        }
        setPublicKey(data.publicKey);
        setAvailable(true);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        setEnabled(!!subscription);
      })
      .catch((err) => {
        setUnavailableReason(t("Push-Konfiguration konnte nicht geladen werden ({error}).", { error: err?.message ?? String(err) }));
      })
      .finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        if (Notification.permission === "denied") {
          toast.error(t("Benachrichtigungen sind im Browser blockiert."));
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error(t("Ohne Erlaubnis keine Benachrichtigungen."));
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
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setEnabled(true);
        toast.success(t("Push-Benachrichtigungen an."));
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
        toast(t("Push-Benachrichtigungen aus."));
      }
    } catch (err) {
      console.error("Push toggle failed", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("Konnte Push-Einstellung nicht ändern ({error}).", { error: message }));
    } finally {
      setBusy(false);
    }
  }

  if (!available) {
    if (!checked) return null;
    return <p className="text-xs text-muted-foreground">{unavailableReason}</p>;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label>{t("Push-Benachrichtigungen")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("Erhalte eine Benachrichtigung, wenn jemand in deinen Gruppen ein Workout postet oder eine Challenge schafft.")}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} disabled={busy} />
    </div>
  );
}
