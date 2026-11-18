"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/components/locale-provider";

type OwnedGroup = { id: string; name: string };

export function DeleteAccountDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[] | null>(null);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { groups: { id: string; name: string; role: string }[] }) => {
        setOwnedGroups(data.groups.filter((g) => g.role === "LEADER"));
      });
  }, [open]);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Löschen fehlgeschlagen."));
      setDeleting(false);
      return;
    }
    await signOut({ redirectTo: "/" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2 className="size-4" />
        {t("Account löschen")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Account endgültig löschen?")}</DialogTitle>
          <DialogDescription>
            {t("Das löscht alle deine Workouts, dein Körpergewicht-Verlauf, deine Klettereinträge und deine Mitgliedschaften in Gruppen. Das kann nicht rückgängig gemacht werden.")}
          </DialogDescription>
        </DialogHeader>

        {ownedGroups && ownedGroups.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {ownedGroups.length === 1 ? t("Du bist Leader von dieser Gruppe:") : t("Du bist Leader von diesen Gruppen:")}{" "}
            <strong>{ownedGroups.map((g) => g.name).join(", ")}</strong>.{" "}
            {ownedGroups.length === 1
              ? t("Übergib die Leitung zuerst (in der Gruppe), sonst wird diese Gruppe komplett gelöscht — auch für alle anderen Mitglieder.")
              : t("Übergib die Leitung zuerst (in der jeweiligen Gruppe), sonst werden diese Gruppen komplett gelöscht — auch für alle anderen Mitglieder.")}
          </div>
        )}

        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-password">{t("Passwort zur Bestätigung")}</Label>
            <Input
              id="delete-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={deleting}>
              {deleting ? t("Löschen…") : t("Endgültig löschen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
