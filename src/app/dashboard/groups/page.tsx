"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedList } from "@/components/feed-list";

type Group = { id: string; name: string; memberCount: number; role: "LEADER" | "MEMBER" };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  function refetch() {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { groups: Group[] }) => setGroups(data.groups));
  }

  useEffect(refetch, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (!res.ok) {
      toast.error("Konnte Gruppe nicht erstellen.");
      return;
    }
    toast.success("Gruppe erstellt!");
    setName("");
    setOpen(false);
    refetch();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gruppen</h1>
          <p className="text-sm text-muted-foreground">Trainiert zusammen, pusht euch.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="size-4" />
            Neu
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Gruppe</DialogTitle>
              <DialogDescription>Du wirst automatisch Owner und kannst danach Leute einladen.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="group-name">Name</Label>
                <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Erstellen…" : "Erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups == null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch in keiner Gruppe. Erstell eine oder lass dich einladen.
        </p>
      ) : (
        <FeedList>
          {groups.map((g) => (
            <Link key={g.id} href={`/dashboard/groups/${g.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.memberCount} Mitglied{g.memberCount === 1 ? "" : "er"}
                      {g.role === "LEADER" ? " · Leader" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </FeedList>
      )}
    </div>
  );
}
