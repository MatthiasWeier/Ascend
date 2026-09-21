"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bell, CalendarDays, ClipboardCopy, ClipboardList, Crown, LogOut, Pencil, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { undoableAction } from "@/lib/undo-toast";
import { formatTimeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { InviteButton } from "@/components/groups/invite-button";
import { GroupFeed } from "@/components/groups/group-feed";
import { GroupChallenges } from "@/components/groups/group-challenges";
import { GroupGoals } from "@/components/groups/group-goals";
import { GroupAnalytics } from "@/components/groups/group-analytics";
import { ActivityCalendar } from "@/components/analytics/activity-calendar";
import { useLocale } from "@/components/locale-provider";
import type { TFunction } from "@/lib/i18n";

type GroupInfo = {
  id: string;
  name: string;
  inviteCode: string;
  myRole: "LEADER" | "MEMBER";
  autoShareWorkouts: boolean;
  members: {
    id: string;
    name: string;
    avatarUrl: string | null;
    lastActiveAt: string | null;
    role: "LEADER" | "MEMBER";
  }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function onlineStatusLabel(
  lastActiveAt: string | null,
  t: TFunction,
  dateLocale: string
): { text: string; online: boolean } {
  if (!lastActiveAt) return { text: t("noch nie online"), online: false };
  const online = Date.now() - new Date(lastActiveAt).getTime() <= ONLINE_THRESHOLD_MS;
  return {
    text: online ? t("Online") : t("zuletzt online {when}", { when: formatTimeAgo(lastActiveAt, t, dateLocale) }),
    online,
  };
}

type MemberTemplate = { id: string; name: string; entries: { exerciseId: string; exercise: { name: string } }[] };

const VALID_TABS = ["feed", "challenges", "goals", "analytics", "members"] as const;

export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { t, dateLocale } = useLocale();
  const { data: authSession } = useSession();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = (VALID_TABS as readonly string[]).includes(requestedTab ?? "")
    ? (requestedTab as (typeof VALID_TABS)[number])
    : "feed";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  // A notification link can point at another tab while this page is already open.
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [transferringTo, setTransferringTo] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const [calendarMember, setCalendarMember] = useState<{ id: string; name: string } | null>(null);
  const [templatesMember, setTemplatesMember] = useState<{ id: string; name: string } | null>(null);
  const [memberTemplates, setMemberTemplates] = useState<MemberTemplate[] | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  function refetch() {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((data: { group: GroupInfo }) => setGroup(data.group));
  }

  useEffect(refetch, [groupId]);

  function handleKick(userId: string, userName: string) {
    if (!group) return;
    const index = group.members.findIndex((m) => m.id === userId);
    if (index === -1) return;
    const member = group.members[index];

    setGroup({ ...group, members: group.members.filter((m) => m.id !== userId) });

    undoableAction({
      message: t("{name} aus der Gruppe entfernt.", { name: userName }),
      undoLabel: t("Rückgängig"),
      onCommit: () => {
        fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" }).catch(() => {});
      },
      onUndo: () => {
        setGroup((g) => {
          if (!g) return g;
          const next = [...g.members];
          next.splice(index, 0, member);
          return { ...g, members: next };
        });
      },
    });
  }

  async function handleLeave() {
    const myUserId = authSession?.user?.id;
    if (!myUserId) return;
    setLeaving(true);
    const res = await fetch(`/api/groups/${groupId}/members/${myUserId}`, { method: "DELETE" });
    setLeaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte Gruppe nicht verlassen."));
      return;
    }
    toast.success(t("Gruppe verlassen."));
    router.push("/dashboard/groups");
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameValue.trim()) return;
    setRenaming(true);
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setRenaming(false);
    if (!res.ok) {
      toast.error(t("Konnte Gruppe nicht umbenennen."));
      return;
    }
    toast.success(t("Gruppe umbenannt."));
    setRenameOpen(false);
    refetch();
  }

  async function handleNudge(userId: string) {
    setNudging(userId);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}/nudge`, { method: "POST" });
    setNudging(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte nicht anstupsen."));
      return;
    }
    toast.success(t("Angestupst!"));
  }

  async function handleTransfer(userId: string) {
    setTransferringTo(userId);
    const res = await fetch(`/api/groups/${groupId}/transfer-leadership`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setTransferringTo(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte Leitung nicht übergeben."));
      return;
    }
    toast.success(t("Leitung übergeben."));
    refetch();
  }

  function openTemplates(member: { id: string; name: string }) {
    setTemplatesMember(member);
    setMemberTemplates(null);
    fetch(`/api/groups/${groupId}/members/${member.id}/templates`)
      .then((r) => r.json())
      .then((data: { templates: MemberTemplate[] }) => setMemberTemplates(data.templates));
  }

  async function handleCopyTemplate(templateId: string) {
    if (!templatesMember) return;
    setCopyingId(templateId);
    const res = await fetch(
      `/api/groups/${groupId}/members/${templatesMember.id}/templates/${templateId}/copy`,
      { method: "POST" }
    );
    setCopyingId(null);
    if (!res.ok) {
      toast.error(t("Konnte Vorlage nicht kopieren."));
      return;
    }
    toast.success(t("Vorlage in deine Bibliothek kopiert!"));
  }

  if (group == null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 lg:max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isLeader = group.myRole === "LEADER";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 lg:max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            {isLeader && (
              <Dialog
                open={renameOpen}
                onOpenChange={(open) => {
                  setRenameOpen(open);
                  if (open) setRenameValue(group.name);
                }}
              >
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      title={t("Gruppe umbenennen")}
                      aria-label={t("Gruppe umbenennen")}
                    />
                  }
                >
                  <Pencil className="size-3.5" />
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleRename}>
                    <DialogHeader>
                      <DialogTitle>{t("Gruppe umbenennen")}</DialogTitle>
                    </DialogHeader>
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      maxLength={60}
                      className="my-2"
                      required
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={renaming}>
                        {renaming ? t("Speichern…") : t("Speichern")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.members.length === 1 ? t("1 Mitglied") : t("{n} Mitglieder", { n: group.members.length })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <InviteButton inviteCode={group.inviteCode} />
          {!isLeader && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title={t("Gruppe verlassen")}
                    aria-label={t("Gruppe verlassen")}
                  />
                }
              >
                <LogOut className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Gruppe verlassen?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Du verlierst den Zugriff auf Feed, Ziele und Challenges dieser Gruppe. Du kannst mit einem neuen Invite-Link wieder beitreten.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
                  <AlertDialogAction disabled={leaving} onClick={handleLeave}>
                    {leaving ? t("Verlassen…") : t("Verlassen")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="feed">{t("Feed")}</TabsTrigger>
          <TabsTrigger value="challenges">{t("Challenges")}</TabsTrigger>
          <TabsTrigger value="goals">{t("Ziele")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("Analytics")}</TabsTrigger>
          <TabsTrigger value="members">{t("Mitglieder")}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <GroupFeed groupId={groupId} initialAutoShare={group.autoShareWorkouts} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="challenges">
          <GroupChallenges groupId={groupId} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="goals">
          <GroupGoals groupId={groupId} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="analytics">
          <GroupAnalytics groupId={groupId} />
        </TabsContent>

        <TabsContent value="members">
          <div className="flex flex-col gap-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar className="size-8">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{m.name}</span>
                  {(() => {
                    const status = onlineStatusLabel(m.lastActiveAt, t, dateLocale);
                    return (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          status.online ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {status.online && <span className="size-1.5 rounded-full bg-success" />}
                        {status.text}
                      </span>
                    );
                  })()}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {m.role === "LEADER" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Crown className="size-3" />
                      {t("Leader")}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    title={t("Kalender ansehen")}
                    onClick={() => setCalendarMember({ id: m.id, name: m.name })}
                  >
                    <CalendarDays className="size-4" />
                  </Button>
                  {m.id !== authSession?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      title={t("Vorlagen ansehen")}
                      onClick={() => openTemplates({ id: m.id, name: m.name })}
                    >
                      <ClipboardList className="size-4" />
                    </Button>
                  )}
                  {m.id !== authSession?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      disabled={nudging === m.id}
                      title={t("Anstupsen")}
                      onClick={() => handleNudge(m.id)}
                    >
                      <Bell className="size-4" />
                    </Button>
                  )}
                  {isLeader && m.role !== "LEADER" && (
                    <>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground"
                            disabled={transferringTo === m.id}
                            title={t("Leitung übergeben")}
                          />
                        }
                      >
                        <Crown className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("Leitung an {name} übergeben?", { name: m.name })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("{name} wird neuer Leader (inkl. Kick-Rechten); du wirst normales Mitglied. Löscht {name} später den Account, geht die Gruppe an sie/ihn über - nicht mehr an dich.", { name: m.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleTransfer(m.id)}>{t("Übergeben")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      title={t("Entfernen")}
                      onClick={() => handleKick(m.id, m.name)}
                    >
                      <UserX className="size-4" />
                    </Button>
                  </>
                )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={calendarMember != null} onOpenChange={(open) => !open && setCalendarMember(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("Kalender von {name}", { name: calendarMember?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Nur Workouts, die in dieser Gruppe geteilt wurden.")}</DialogDescription>
          </DialogHeader>
          {calendarMember && (
            <ActivityCalendar
              daysUrl={(year) => `/api/groups/${groupId}/members/${calendarMember.id}/calendar?year=${year}`}
              sessionsUrl={(date) =>
                `/api/groups/${groupId}/members/${calendarMember.id}/workouts-by-date?date=${date}`
              }
              editable={false}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={templatesMember != null} onOpenChange={(open) => !open && setTemplatesMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Vorlagen von {name}", { name: templatesMember?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Kopieren übernimmt die Übungs-Reihenfolge in deine eigene Bibliothek.")}</DialogDescription>
          </DialogHeader>
          {memberTemplates == null ? (
            <Skeleton className="h-24 w-full" />
          ) : memberTemplates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("Noch keine Vorlagen.")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {memberTemplates.map((tpl) => (
                <div key={tpl.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{tpl.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={copyingId === tpl.id}
                      onClick={() => handleCopyTemplate(tpl.id)}
                    >
                      <ClipboardCopy className="size-3.5" />
                      {copyingId === tpl.id ? t("Kopieren…") : t("Kopieren")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tpl.entries.map((e) => e.exercise.name).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
