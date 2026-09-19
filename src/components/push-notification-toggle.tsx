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
      setUnavailableReason(t("Push wird von diesem Browser nicht unterstützt."));
      setChecked(true);
      return;
    }
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "-");

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
        if (subscription) setPushHost(new URL(subscription.endpoint).host);
      })
      .catch((err) => {
        setUnavailableReason(t("Push-Konfiguration konnte nicht geladen werden ({error}).", { error: err?.message ?? String(err) }));
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
          toast.error(t("Benachrichtigungen sind im Browser blockiert."));
          return;
        }
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        if (permissionResult !== "granted") {
          toast.error(t("Ohne Erlaubnis keine Benachrichtigungen."));
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
        setPushHost(null);
        toast(t("Push-Benachrichtigungen aus."));
      }
    } catch (err) {
      console.error("Push toggle failed", err);
      const message = describeError(err);
      setLastError(message);
      toast.error(t("Konnte Push-Einstellung nicht ändern ({error}).", { error: message }));
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
          <Label>{t("Push-Benachrichtigungen")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Erhalte eine Benachrichtigung, wenn jemand in deinen Gruppen ein Workout postet oder eine Challenge schafft.")}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={busy} />
      </div>

      {enabled && (
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={busy} onClick={sendTest}>
          <Bell className="size-4" />
          {t("Test-Benachrichtigung an dieses Konto senden")}
        </Button>
      )}

      {testResults && (
        <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs">
          {testResults.length === 0 ? (
            <p>{t("Für dein Konto ist kein Gerät angemeldet.")}</p>
          ) : (
            testResults.map((r, i) => (
              <p key={i} className={r.ok ? "text-success" : "text-destructive"}>
                {r.host}: {r.ok ? t("gesendet - kommt es an?") : `${t("Fehler")} ${r.statusCode ?? ""} ${r.detail ?? ""}`}
              </p>
            ))
          )}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">{t("Diagnose")}</p>
        <p>{t("Erlaubnis")}: {permission}</p>
        <p>{t("Push-Dienst")}: {pushHost ?? "-"}</p>
        <p>{t("Abo aktiv")}: {enabled ? t("ja") : t("nein")}</p>
        {lastError && <p className="text-destructive">{t("Letzter Fehler")}: {lastError}</p>}
        {permission === "denied" && (
          <p className="mt-1">
            {t("Blockiert: in den Website-Einstellungen des Browsers (Schloss-Symbol neben der Adresse) Benachrichtigungen auf 'Zulassen' stellen und die Seite neu laden.")}
          </p>
        )}
      </div>
    </div>
  );
}
