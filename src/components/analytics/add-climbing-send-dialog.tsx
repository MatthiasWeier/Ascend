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
import { useT } from "@/components/locale-provider";

export function AddClimbingSendDialog({ onAdded }: { onAdded: () => void }) {
  const t = useT();
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
      toast.error(t("Couldn't save the send."));
      return;
    }
    toast.success(t("Send saved!"));
    setGrade("");
    setAttempts("1");
    setOpen(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" />
        {t("Log send")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Log send")}</DialogTitle>
          <DialogDescription>{t("Boulder or route with grade.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs value={style} onValueChange={(v) => setStyle(v as "BOULDER" | "ROUTE")}>
            <TabsList className="w-full">
              <TabsTrigger value="BOULDER" className="flex-1">
                {t("Boulder")}
              </TabsTrigger>
              <TabsTrigger value="ROUTE" className="flex-1">
                {t("Route")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grade">{t("Grade")}</Label>
            <Input
              id="grade"
              placeholder={style === "BOULDER" ? t("e.g. V5") : t("e.g. 6a+")}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attempts">{t("Attempts")}</Label>
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
              {loading ? t("Saving…") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
