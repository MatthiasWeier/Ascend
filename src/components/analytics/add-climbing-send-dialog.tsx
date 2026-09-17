"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AddClimbingSendDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<"BOULDER" | "ROUTE">("BOULDER");
  const [grade, setGrade] = useState("");
  const [attempts, setAttempts] = useState("1");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grade.trim()) return;
    setLoading(true);
    const res = await fetch("/api/climbing-sends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style, grade: grade.trim(), attempts: Number(attempts) || 1 }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Konnte Send nicht speichern.");
      return;
    }
    toast.success("Send gespeichert!");
    setGrade("");
    setAttempts("1");
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" />
        Send eintragen
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send eintragen</DialogTitle>
          <DialogDescription>Boulder oder Route mit Schwierigkeitsgrad.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs value={style} onValueChange={(v) => setStyle(v as "BOULDER" | "ROUTE")}>
            <TabsList className="w-full">
              <TabsTrigger value="BOULDER" className="flex-1">
                Boulder
              </TabsTrigger>
              <TabsTrigger value="ROUTE" className="flex-1">
                Route
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grade">Grad</Label>
            <Input
              id="grade"
              placeholder={style === "BOULDER" ? "z.B. V5" : "z.B. 6a+"}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attempts">Versuche</Label>
            <Input
              id="attempts"
              type="number"
              min={1}
              value={attempts}
              onChange={(e) => setAttempts(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
