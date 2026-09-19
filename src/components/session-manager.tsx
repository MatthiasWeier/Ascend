"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Laptop, LogOut } from "lucide-react";
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

type SessionInfo = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

// Best-effort, cosmetic only - just enough to tell devices apart in the
// list, not a real UA parser.
function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unbekanntes Gerät";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";
  return "Unbekanntes Gerät";
}

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  function refetch() {
    fetch("/api/settings/sessions")
      .then((r) => r.json())
      .then((data: { sessions: SessionInfo[] }) => setSessions(data.sessions));
  }

  useEffect(refetch, []);

  async function revoke(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/settings/sessions/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Konnte Sitzung nicht beenden.");
      return;
    }
    toast.success("Sitzung beendet.");
    refetch();
  }

  async function revokeOthers() {
    setRevokingAll(true);
    const res = await fetch("/api/settings/sessions", { method: "DELETE" });
    setRevokingAll(false);
    if (!res.ok) {
      toast.error("Konnte andere Sitzungen nicht beenden.");
      return;
    }
    toast.success("Alle anderen Sitzungen beendet.");
    refetch();
  }

  if (sessions == null) return <Skeleton className="h-24 w-full" />;

  const hasOthers = sessions.some((s) => !s.isCurrent);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-2.5">
              <Laptop className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {describeUserAgent(s.userAgent)}
                  {s.isCurrent && <span className="ml-1.5 text-xs text-success">(dieses Gerät)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Zuletzt aktiv {new Date(s.lastSeenAt).toLocaleString("de-DE")}
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" disabled={busyId === s.id} />
                }
              >
                <LogOut className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Diese Sitzung beenden?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {s.isCurrent
                      ? "Das meldet dich auf diesem Gerät ab."
                      : "Das Gerät wird beim nächsten Zugriff automatisch abgemeldet."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => revoke(s.id)}>Beenden</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
      {hasOthers && (
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={revokingAll} onClick={revokeOthers}>
          {revokingAll ? "Einen Moment…" : "Alle anderen Sitzungen beenden"}
        </Button>
      )}
    </div>
  );
}
