"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bell, Crown, LogOut, Pencil, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { InviteButton } from "@/components/groups/invite-button";
import { GroupFeed } from "@/components/groups/group-feed";
import { GroupChallenges } from "@/components/groups/group-challenges";
import { GroupGoals } from "@/components/groups/group-goals";
import { GroupAnalytics } from "@/components/groups/group-analytics";

type GroupInfo = {
  id: string;
  name: string;
  inviteCode: string;
  myRole: "LEADER" | "MEMBER";
  autoShareWorkouts: boolean;
  members: { id: string; name: string; role: "LEADER" | "MEMBER" }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const VALID_TABS = ["feed", "challenges", "goals", "analytics", "members"] as const;

export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = (VALID_TABS as readonly string[]).includes(requestedTab ?? "")
    ? (requestedTab as (typeof VALID_TABS)[number])
    : "feed";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [transferringTo, setTransferringTo] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);

  function refetch() {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((data: { group: GroupInfo }) => setGroup(data.group));
  }

  useEffect(refetch, [groupId]);

  async function handleKick(userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Konnte Mitglied nicht entfernen.");
      return;
    }
    toast.success("Mitglied entfernt.");
    refetch();
  }

  async function handleLeave() {
    const myUserId = authSession?.user?.id;
    if (!myUserId) return;
    setLeaving(true);
    const res = await fetch(`/api/groups/${groupId}/members/${myUserId}`, { method: "DELETE" });
    setLeaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte Gruppe nicht verlassen.");
      return;
    }
    toast.success("Gruppe verlassen.");
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
      toast.error("Konnte Gruppe nicht umbenennen.");
      return;
    }
    toast.success("Gruppe umbenannt.");
    setRenameOpen(false);
    refetch();
  }

  async function handleNudge(userId: string) {
    setNudging(userId);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}/nudge`, { method: "POST" });
    setNudging(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Konnte nicht anstupsen.");
      return;
    }
    toast.success("Angestupst!");
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
      toast.error(data.error ?? "Konnte Leitung nicht übergeben.");
      return;
    }
    toast.success("Leitung übergeben.");
    refetch();
  }

  if (group == null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isLeader = group.myRole === "LEADER";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
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
                <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}>
                  <Pencil className="size-3.5" />
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleRename}>
                    <DialogHeader>
                      <DialogTitle>Gruppe umbenennen</DialogTitle>
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
                        {renaming ? "Speichern…" : "Speichern"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.members.length} Mitglied{group.members.length === 1 ? "" : "er"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <InviteButton inviteCode={group.inviteCode} />
          {!isLeader && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" />}>
                <LogOut className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Gruppe verlassen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Du verlierst den Zugriff auf Feed, Ziele und Challenges dieser Gruppe. Du
                    kannst mit einem neuen Invite-Link wieder beitreten.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction disabled={leaving} onClick={handleLeave}>
                    {leaving ? "Verlassen…" : "Verlassen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="goals">Ziele</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="members">Mitglieder</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <GroupFeed groupId={groupId} initialAutoShare={group.autoShareWorkouts} />
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
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  {m.role === "LEADER" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Crown className="size-3" />
                      Leader
                    </span>
                  )}
                  {m.id !== authSession?.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      disabled={nudging === m.id}
                      title="Anstupsen"
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
                            title="Leitung übergeben"
                          />
                        }
                      >
                        <Crown className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leitung an {m.name} übergeben?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.name} wird neuer Leader (inkl. Kick-Rechten); du wirst normales
                            Mitglied. Löscht {m.name} später den Account, geht die Gruppe an sie/ihn
                            über - nicht mehr an dich.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleTransfer(m.id)}>Übergeben</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" />}>
                        <UserX className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{m.name} aus der Gruppe entfernen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Person verliert den Zugriff auf Feed und Challenges der Gruppe. Sie kann per neuem Invite-Link wieder beitreten.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleKick(m.id)}>Entfernen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
