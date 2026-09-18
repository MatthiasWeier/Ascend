"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SetupData = { secret: string; qrCodeDataUri: string };

// Small reusable "type your password to confirm" dialog - used for both
// disabling 2FA and regenerating backup codes, since both are sensitive
// downgrades that shouldn't be doable from a hijacked-but-logged-in tab
// without proving the password again.
function PasswordConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    await onConfirm(password);
    setBusy(false);
    setPassword("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-password">Passwort</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button variant="destructive" disabled={busy || !password} onClick={handleConfirm}>
            {busy ? "Einen Moment…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BackupCodesDialog({
  codes,
  onClose,
}: {
  codes: string[] | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={codes != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backup-Codes</DialogTitle>
          <DialogDescription>
            Jeder Code funktioniert einmal, falls du keinen Zugriff mehr auf deine
            Authenticator-App hast. Speichere sie jetzt - sie werden nur dieses eine Mal
            angezeigt.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/40 p-3 font-mono text-sm">
          {codes?.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Gespeichert - schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TwoFactorSetup({
  enabled,
  onChanged,
}: {
  enabled: boolean;
  onChanged: () => void;
}) {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<"disable" | "regenerate" | null>(null);

  async function startSetup() {
    setBusy(true);
    const res = await fetch("/api/settings/2fa/setup", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte 2FA-Setup nicht starten.");
      return;
    }
    const data = await res.json();
    setSetupData({ secret: data.secret, qrCodeDataUri: data.qrCodeDataUri });
  }

  async function confirmSetup() {
    setBusy(true);
    const res = await fetch("/api/settings/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Code ist falsch.");
      return;
    }
    const data = await res.json();
    setSetupData(null);
    setToken("");
    setBackupCodes(data.backupCodes);
    toast.success("2FA aktiviert!");
    onChanged();
  }

  async function handleDisable(password: string) {
    const res = await fetch("/api/settings/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte 2FA nicht deaktivieren.");
      return;
    }
    setConfirmDialog(null);
    toast.success("2FA deaktiviert.");
    onChanged();
  }

  async function handleRegenerate(password: string) {
    const res = await fetch("/api/settings/2fa/backup-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte Backup-Codes nicht erneuern.");
      return;
    }
    const data = await res.json();
    setConfirmDialog(null);
    setBackupCodes(data.backupCodes);
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm text-success">
          <ShieldCheck className="size-4" />
          Zwei-Faktor-Authentifizierung ist aktiviert.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog("regenerate")}
          >
            <KeyRound className="size-4" />
            Backup-Codes neu generieren
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDialog("disable")}
          >
            <ShieldOff className="size-4" />
            Deaktivieren
          </Button>
        </div>

        <PasswordConfirmDialog
          open={confirmDialog === "disable"}
          title="2FA deaktivieren?"
          description="Dein Konto ist danach nur noch mit Benutzername und Passwort geschützt."
          confirmLabel="Deaktivieren"
          onOpenChange={(o) => !o && setConfirmDialog(null)}
          onConfirm={handleDisable}
        />
        <PasswordConfirmDialog
          open={confirmDialog === "regenerate"}
          title="Backup-Codes neu generieren?"
          description="Alle bisherigen Backup-Codes werden ungültig."
          confirmLabel="Neu generieren"
          onOpenChange={(o) => !o && setConfirmDialog(null)}
          onConfirm={handleRegenerate}
        />
        <BackupCodesDialog codes={backupCodes} onClose={() => setBackupCodes(null)} />
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Scanne den Code mit deiner Authenticator-App (Google Authenticator, Aegis,
          1Password, ...) und gib den angezeigten 6-stelligen Code ein, um zu bestätigen.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, Next's image optimizer doesn't apply */}
        <img
          src={setupData.qrCodeDataUri}
          alt="QR-Code für 2FA-Setup"
          width={200}
          height={200}
          className="rounded-lg border border-border"
        />
        <p className="break-all font-mono text-xs text-muted-foreground">
          Manuell: {setupData.secret}
        </p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-32"
          />
          <Button type="button" disabled={busy || token.length !== 6} onClick={confirmSetup}>
            {busy ? "Prüfe…" : "Bestätigen"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSetupData(null)}>
            Abbrechen
          </Button>
        </div>
        <BackupCodesDialog codes={backupCodes} onClose={() => setBackupCodes(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Schützt dein Konto mit einem zusätzlichen Code aus einer Authenticator-App beim
        Login.
      </p>
      <Button type="button" size="sm" className="w-fit" disabled={busy} onClick={startSetup}>
        <ShieldCheck className="size-4" />
        Aktivieren
      </Button>
    </div>
  );
}
