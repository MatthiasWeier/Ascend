"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type GroupInfo = {
  id: string;
  name: string;
  inviteCode: string;
  myRole: "LEADER" | "MEMBER";
  members: { id: string; name: string; role: "LEADER" | "MEMBER" }[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function GroupDetail({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<GroupInfo | null>(null);

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
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group.members.length} Mitglied{group.members.length === 1 ? "" : "er"}
          </p>
        </div>
        <InviteButton inviteCode={group.inviteCode} />
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="goals">Ziele</TabsTrigger>
          <TabsTrigger value="members">Mitglieder</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <GroupFeed groupId={groupId} />
        </TabsContent>

        <TabsContent value="challenges">
          <GroupChallenges groupId={groupId} isLeader={isLeader} />
        </TabsContent>

        <TabsContent value="goals">
          <GroupGoals groupId={groupId} isLeader={isLeader} />
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
                {m.role === "LEADER" && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Crown className="size-3" />
                    Leader
                  </span>
                )}
                {isLeader && m.role !== "LEADER" && (
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-destructive" />}>
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
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
