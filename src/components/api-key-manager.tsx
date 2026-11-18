"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocale } from "@/components/locale-provider";

type ApiKeyInfo = {
  id: string;
  name: string;
  keyPrefix: string;
  scope: "READ_ONLY" | "READ_WRITE";
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeyManager() {
  const { t, dateLocale } = useLocale();
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [readWrite, setReadWrite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  function refetch() {
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((data: { keys: ApiKeyInfo[] }) => setKeys(data.keys));
  }

  useEffect(refetch, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scope: readWrite ? "READ_WRITE" : "READ_ONLY" }),
    });
    setCreating(false);
    if (!res.ok) {
      toast.error(t("Couldn't create the API key."));
      return;
    }
    const data: { rawKey: string } = await res.json();
    setName("");
    setReadWrite(false);
    setCreateOpen(false);
    setNewRawKey(data.rawKey);
    refetch();
  }

  async function handleRevoke(keyId: string) {
    const res = await fetch(`/api/settings/api-keys/${keyId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("Couldn't revoke the key."));
      return;
    }
    toast.success(t("Key revoked."));
    refetch();
  }

  function copyNewKey() {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey).then(() => toast.success(t("Copied.")));
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="self-start" />}>
          <Key className="size-3.5" />
          {t("New API key")}
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("Create API key")}</DialogTitle>
              <DialogDescription>{t("For your own scripts/automations against /api/v1/*.")}</DialogDescription>
            </DialogHeader>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Home Assistant script")}
              className="my-2"
              required
            />
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="apikey-readwrite" className="text-sm font-normal">
                  {t("Allow write access")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("Read-only by default - lets the key change data (create workouts, log body weight, ...).")}
                </p>
              </div>
              <Switch id="apikey-readwrite" checked={readWrite} onCheckedChange={setReadWrite} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? t("Creating…") : t("Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {keys == null ? (
        <Skeleton className="h-16 w-full" />
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("No API keys yet.")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
              <div>
                <p className="text-sm font-medium">{k.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {k.keyPrefix}… · {k.scope === "READ_WRITE" ? t("read/write access") : t("read-only")} ·{" "}
                  {k.lastUsedAt
                    ? t("last used {date}", { date: new Date(k.lastUsedAt).toLocaleDateString(dateLocale) })
                    : t("never used")}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" />}>
                  <Trash2 className="size-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("Revoke \"{name}\"?", { name: k.name })}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("Scripts using this key lose access immediately.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRevoke(k.id)}>{t("Revoke")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newRawKey != null} onOpenChange={(open) => !open && setNewRawKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Your new API key")}</DialogTitle>
            <DialogDescription>
              {t("Shown only this once - copy it now and store it safely.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={newRawKey ?? ""} className="font-mono text-xs" />
            <Button type="button" variant="ghost" size="icon" onClick={copyNewKey}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setNewRawKey(null)}>
              {t("Done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
