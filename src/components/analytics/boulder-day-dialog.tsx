"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function BoulderDayDialog({
  date,
  open,
  onOpenChange,
  onSaved,
}: {
  date: string; // YYYY-MM-DD
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  function bump(grade: string, delta: number) {
    setCounts((prev) => ({ ...prev, [grade]: Math.max(0, (prev[grade] ?? 0) + delta) }));
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  async function handleSave() {
    const entries = GRADES.filter((g) => (counts[g] ?? 0) > 0).map((g) => ({ grade: g, count: counts[g] }));
    if (entries.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/climbing-sends/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, style: "BOULDER", entries }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Konnte nicht speichern.");
      return;
    }
    toast.success("Boulder-Tag gespeichert!");
    setCounts({});
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bouldern am {new Date(date).toLocaleDateString("de-DE")}</DialogTitle>
          <DialogDescription>Wie viele Boulder pro Schwierigkeit?</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {GRADES.map((grade) => (
            <div key={grade} className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm font-medium">Grad {grade}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => bump(grade, -1)}
                  disabled={(counts[grade] ?? 0) === 0}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-5 text-center text-sm tabular-nums">{counts[grade] ?? 0}</span>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => bump(grade, 1)}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || total === 0}>
            {saving ? "Speichern…" : `${total} Boulder speichern`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
