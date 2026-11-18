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
      toast.error(t(data.error ?? "Couldn't change the admin status."));
      return;
    }
    toast.success(next ? t("Made admin.") : t("Admin rights removed."));
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
      toast.error(t(data.error ?? "Couldn't reset 2FA."));
      return;
    }
    toast.success(t("2FA reset for this user."));
    refetch();
  }

  async function deleteUser(userId: string) {
    setBusyId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't delete the user."));
      return;
    }
    toast.success(t("User deleted."));
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
                {t("{workouts} workouts · {groups} groups · since {date}", {
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
                title={isSelf ? t("You can't change your own admin status") : undefined}
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
                      title={t("Reset 2FA for this user")}
                    />
                  }
                >
                  <ShieldOff className="size-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("Reset 2FA for {name}?", { name: u.name })}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("Disables two-factor authentication for this account and deletes all backup codes - in case the person lost their authenticator app and backup codes. They can set up 2FA again in Settings afterwards.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disableTotp(u.id)}>
                      {t("Reset")}
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
                    title={isSelf ? t("Use account deletion in Settings") : t("Delete user")}
                  />
                }
              >
                <Trash2 className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Delete {name} (@{username})?", { name: u.name, username: u.username })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Permanently deletes the account and all related data (workouts, group memberships, own groups). This can't be undone.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteUser(u.id)}>{t("Delete")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}
