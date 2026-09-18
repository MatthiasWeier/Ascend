"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ApiKeyInfo = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
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
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (!res.ok) {
      toast.error("Konnte API-Key nicht erstellen.");
      return;
    }
    const data: { rawKey: string } = await res.json();
    setName("");
    setCreateOpen(false);
    setNewRawKey(data.rawKey);
    refetch();
  }

  async function handleRevoke(keyId: string) {
    const res = await fetch(`/api/settings/api-keys/${keyId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Konnte Key nicht widerrufen.");
      return;
    }
    toast.success("Key widerrufen.");
    refetch();
  }

  function copyNewKey() {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey).then(() => toast.success("Kopiert."));
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="self-start" />}>
          <Key className="size-3.5" />
          Neuer API-Key
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>API-Key erstellen</DialogTitle>
              <DialogDescription>Für eigene Scripts/Automationen gegen /api/v1/*.</DialogDescription>
            </DialogHeader>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Homeassistant-Script"
              className="my-2"
              required
            />
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "Erstellen…" : "Erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {keys == null ? (
        <Skeleton className="h-16 w-full" />
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine API-Keys.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
              <div>
                <p className="text-sm font-medium">{k.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {k.keyPrefix}… ·{" "}
                  {k.lastUsedAt
                    ? `zuletzt genutzt ${new Date(k.lastUsedAt).toLocaleDateString("de-DE")}`
                    : "noch nie genutzt"}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" />}>
                  <Trash2 className="size-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>"{k.name}" widerrufen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Scripts, die diesen Key benutzen, verlieren sofort den Zugriff.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRevoke(k.id)}>Widerrufen</AlertDialogAction>
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
            <DialogTitle>Dein neuer API-Key</DialogTitle>
            <DialogDescription>
              Wird nur dieses eine Mal angezeigt - jetzt kopieren und sicher speichern.
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
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
