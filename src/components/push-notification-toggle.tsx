"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

type TestResult = { host: string; ok: boolean; statusCode?: number; detail?: string };

export function PushNotificationToggle() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<string>("-");
  const [pushHost, setPushHost] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setUnavailableReason(t("Push isn't supported by this browser."));
      setChecked(true);
      return;
    }
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "-");

    fetch("/api/push/config")
      .then((r) => r.json())
      .then(async (data: { configured?: boolean; publicKey?: string | null; error?: string }) => {
        if (data.error) {
          setUnavailableReason(t("Couldn't load the push configuration ({error}).", { error: data.error }));
          return;
        }
        if (!data.configured || !data.publicKey) {
          setUnavailableReason(t("Push isn't set up on the server."));
          return;
        }
        setPublicKey(data.publicKey);
        setAvailable(true);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        setEnabled(!!subscription);
        if (subscription) setPushHost(new URL(subscription.endpoint).host);
      })
      .catch((err) => {
        setUnavailableReason(t("Couldn't load the push configuration ({error}).", { error: err?.message ?? String(err) }));
      })
      .finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    setLastError(null);
    setTestResults(null);
    try {
      if (next) {
        if (Notification.permission === "denied") {
          setPermission("denied");
          toast.error(t("Notifications are blocked in the browser."));
          return;
        }
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        if (permissionResult !== "granted") {
          toast.error(t("No notifications without permission."));
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!) as BufferSource,
        });
        setPushHost(new URL(subscription.endpoint).host);
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
        toast.success(t("Push notifications on."));
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
        setPushHost(null);
        toast(t("Push notifications off."));
      }
    } catch (err) {
      console.error("Push toggle failed", err);
      const message = describeError(err);
      setLastError(message);
      toast.error(t("Couldn't change the push setting ({error}).", { error: message }));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setTestResults(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data: { results?: TestResult[]; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTestResults(data.results ?? []);
    } catch (err) {
      setLastError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!available) {
    if (!checked) return null;
    return <p className="text-xs text-muted-foreground">{unavailableReason}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>{t("Push notifications")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Get a notification when someone in your groups posts a workout or completes a challenge.")}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={busy} />
      </div>

      {enabled && (
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={busy} onClick={sendTest}>
          <Bell className="size-4" />
          {t("Send test notification to this account")}
        </Button>
      )}

      {testResults && (
        <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs">
          {testResults.length === 0 ? (
            <p>{t("No device is registered for your account.")}</p>
          ) : (
            testResults.map((r, i) => (
              <p key={i} className={r.ok ? "text-success" : "text-destructive"}>
                {r.host}: {r.ok ? t("sent - did it arrive?") : `${t("Error")} ${r.statusCode ?? ""} ${r.detail ?? ""}`}
              </p>
            ))
          )}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">{t("Diagnostics")}</p>
        <p>{t("Permission")}: {permission}</p>
        <p>{t("Push service")}: {pushHost ?? "-"}</p>
        <p>{t("Subscription active")}: {enabled ? t("yes") : t("no")}</p>
        {lastError && <p className="text-destructive">{t("Last error")}: {lastError}</p>}
        {permission === "denied" && (
          <p className="mt-1">
            {t("Blocked: in the browser's site settings (lock icon next to the address) set notifications to 'Allow' and reload the page.")}
          </p>
        )}
      </div>
    </div>
  );
}
