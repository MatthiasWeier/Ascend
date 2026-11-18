"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bell, CalendarDays, ClipboardCopy, ClipboardList, Crown, LogOut, Pencil, PersonStanding, UserX } from "lucide-react";
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
import { BodyView } from "@/components/body-view";
import { GroupClimbingMeetups } from "@/components/groups/group-climbing-meetups";
import { GroupQuests } from "@/components/groups/group-quests";
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
  if (!lastActiveAt) return { text: t("never online"), online: false };
  const online = Date.now() - new Date(lastActiveAt).getTime() <= ONLINE_THRESHOLD_MS;
  return {
    text: online ? t("Online") : t("last online {when}", { when: formatTimeAgo(lastActiveAt, t, dateLocale) }),
    online,
  };
}

type MemberTemplate = { id: string; name: string; entries: { exerciseId: string; exercise: { name: string } }[] };

const VALID_TABS = ["feed", "challenges", "goals", "quests", "climbing", "analytics", "members"] as const;

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
  const [bodyMember, setBodyMember] = useState<{ id: string; name: string } | null>(null);
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
      message: t("{name} removed from the group.", { name: userName }),
      undoLabel: t("Undo"),
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
      toast.error(t(data.error ?? "Couldn't leave the group."));
      return;
    }
    toast.success(t("Left the group."));
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
      toast.error(t("Couldn't rename the group."));
      return;
    }
    toast.success(t("Group renamed."));
    setRenameOpen(false);
    refetch();
  }

  async function handleNudge(userId: string) {
    setNudging(userId);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}/nudge`, { method: "POST" });
    setNudging(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't nudge."));
      return;
    }
    toast.success(t("Nudged!"));
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
      toast.error(t(data.error ?? "Couldn't hand over leadership."));
      return;
    }
    toast.success(t("Leadership handed over."));
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
      toast.error(t("Couldn't copy the template."));
      return;
    }
    toast.success(t("Template copied to your library!"));
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
                      title={t("Rename group")}
                      aria-label={t("Rename group")}
                    />
                  }
                >
                  <Pencil className="size-3.5" />
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleRename}>
                    <DialogHeader>
                      <DialogTitle>{t("Rename group")}</DialogTitle>
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
                        {renaming ? t("Saving…") : t("Save")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.members.length === 1 ? t("1 member") : t("{n} members", { n: group.members.length })}
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
                    title={t("Leave group")}
                    aria-label={t("Leave group")}
                  />
                }
              >
                <LogOut className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Leave group?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("You'll lose access to this group's feed, goals and challenges. You can rejoin with a new invite link.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction disabled={leaving} onClick={handleLeave}>
                    {leaving ? t("Leaving…") : t("Leave")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max justify-start [&>*]:shrink-0">
            <TabsTrigger value="feed">{t("Feed")}</TabsTrigger>
            <TabsTrigger value="challenges">{t("Challenges")}</TabsTrigger>
            <TabsTrigger value="goals">{t("Goals")}</TabsTrigger>
            <TabsTrigger value="quests">{t("Sidequests")}</TabsTrigger>
            <TabsTrigger value="climbing">{t("Climbing")}</TabsTrigger>
            <TabsTrigger value="analytics">{t("Analytics")}</TabsTrigger>
            <TabsTrigger value="members">{t("Members")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed">
          <GroupFeed groupId={groupId} initialAutoShare={group.autoShareWorkouts} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="challenges">
          <GroupChallenges groupId={groupId} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="goals">
          <GroupGoals groupId={groupId} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="quests">
          <GroupQuests groupId={groupId} />
        </TabsContent>

        <TabsContent value="climbing">
          <GroupClimbingMeetups groupId={groupId} />
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
                    title={t("View calendar")}
                    onClick={() => setCalendarMember({ id: m.id, name: m.name })}
                  >
                    <CalendarDays className="size-4" />
                  </Button>
                  {m.id !== authSession?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      title={t("View body")}
                      onClick={() => setBodyMember({ id: m.id, name: m.name })}
                    >
                      <PersonStanding className="size-4" />
                    </Button>
                  )}
                  {m.id !== authSession?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      title={t("View templates")}
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
                      title={t("Nudge")}
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
                            title={t("Hand over leadership")}
                          />
                        }
                      >
                        <Crown className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("Hand over leadership to {name}?", { name: m.name })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("{name} becomes the new leader (including kick rights); you become a regular member. If {name} later deletes their account, the group goes to them - no longer to you.", { name: m.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleTransfer(m.id)}>{t("Hand over")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      title={t("Remove")}
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
            <DialogTitle>{t("{name}'s calendar", { name: calendarMember?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Only workouts that were shared in this group.")}</DialogDescription>
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

      <Dialog open={bodyMember != null} onOpenChange={(open) => !open && setBodyMember(null)}>
        <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("{name}'s body", { name: bodyMember?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Only training shared into this group, plus active injuries.")}</DialogDescription>
          </DialogHeader>
          {bodyMember && (
            <BodyView key={bodyMember.id} apiUrl={`/api/groups/${groupId}/members/${bodyMember.id}/body`} readOnly />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={templatesMember != null} onOpenChange={(open) => !open && setTemplatesMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("{name}'s templates", { name: templatesMember?.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("Copying takes the exercise order into your own library.")}</DialogDescription>
          </DialogHeader>
          {memberTemplates == null ? (
            <Skeleton className="h-24 w-full" />
          ) : memberTemplates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("No templates yet.")}</p>
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
                      {copyingId === tpl.id ? t("Copying…") : t("Copy")}
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
