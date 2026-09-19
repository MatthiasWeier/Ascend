"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

type AdminUser = {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
  totpEnabled: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  _count: { workoutSessions: number; groupMemberships: number };
};

export function AdminUserTable({ currentUserId }: { currentUserId: string }) {
  const { t, dateLocale } = useLocale();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function refetch() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: { users: AdminUser[] }) => setUsers(data.users));
  }

  useEffect(refetch, []);

  async function toggleAdmin(userId: string, next: boolean) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: next }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte Admin-Status nicht ändern."));
      return;
    }
    toast.success(next ? t("Zum Admin gemacht.") : t("Admin-Rechte entfernt."));
    refetch();
  }

  async function disableTotp(userId: string) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disableTotp: true }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte 2FA nicht zurücksetzen."));
      return;
    }
    toast.success(t("2FA für diesen Nutzer zurückgesetzt."));
    refetch();
  }

  async function deleteUser(userId: string) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte Nutzer nicht löschen."));
      return;
    }
    toast.success(t("Nutzer gelöscht."));
    refetch();
  }

  if (users == null) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => {
        const isSelf = u.id === currentUserId;
        return (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {u.name} <span className="text-muted-foreground">@{u.username}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("{workouts} Workouts · {groups} Gruppen · seit {date}", {
                  workouts: u._count.workoutSessions,
                  groups: u._count.groupMemberships,
                  date: new Date(u.createdAt).toLocaleDateString(dateLocale),
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Admin</span>
              <Switch
                checked={u.isAdmin}
                disabled={isSelf || busyId === u.id}
                onCheckedChange={(v) => toggleAdmin(u.id, v)}
                title={isSelf ? t("Du kannst deinen eigenen Admin-Status nicht ändern") : undefined}
              />
            </div>
            {u.totpEnabled && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={busyId === u.id}
                      title={t("2FA für diesen Nutzer zurücksetzen")}
                    />
                  }
                >
                  <ShieldOff className="size-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("2FA für {name} zurücksetzen?", { name: u.name })}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("Deaktiviert die Zwei-Faktor-Authentifizierung für dieses Konto und löscht alle Backup-Codes - für den Fall, dass die Person ihre Authenticator-App und Backup-Codes verloren hat. Sie kann 2FA danach in den Einstellungen neu einrichten.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disableTotp(u.id)}>
                      {t("Zurücksetzen")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isSelf || busyId === u.id}
                    title={isSelf ? t("Nutze die Konto-Löschung in den Einstellungen") : t("Nutzer löschen")}
                  />
                }
              >
                <Trash2 className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("{name} (@{username}) löschen?", { name: u.name, username: u.username })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Löscht das Konto und alle zugehörigen Daten (Workouts, Gruppen-Mitgliedschaften, eigene Gruppen) endgültig. Das kann nicht rückgängig gemacht werden.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteUser(u.id)}>{t("Löschen")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}
