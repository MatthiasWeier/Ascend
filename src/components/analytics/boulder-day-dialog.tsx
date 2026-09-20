"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8"];

// Log or edit one climbing day. Opens pre-filled with whatever is already
// saved for that date and saves the whole picture back.
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
  const { t, dateLocale } = useLocale();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [hadExisting, setHadExisting] = useState(false);
  const [other, setOther] = useState(0);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/climbing-sends?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { boulders: Record<string, number>; other: number }) => {
        if (cancelled) return;
        setCounts(data.boulders);
        setHadExisting(Object.keys(data.boulders).length > 0);
        setOther(data.other);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error(t("Konnte den Tag nicht laden."));
        onOpenChange(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function bump(grade: string, delta: number) {
    setCounts((prev) => ({ ...prev, [grade]: Math.max(0, (prev[grade] ?? 0) + delta) }));
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  async function handleSave() {
    const entries = GRADES.filter((g) => (counts[g] ?? 0) > 0).map((g) => ({ grade: g, count: counts[g] }));
    if (entries.length === 0 && !hadExisting) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    const res = await fetch("/api/climbing-sends/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, style: "BOULDER", entries }),
    });
    setSaving(false);
    submittingRef.current = false;
    if (!res.ok) {
      toast.error(t("Konnte nicht speichern."));
      return;
    }
    toast.success(entries.length === 0 ? t("Boulder-Tag geleert.") : hadExisting ? t("Boulder-Tag aktualisiert!") : t("Boulder-Tag gespeichert!"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("Bouldern am {date}", { date: new Date(date).toLocaleDateString(dateLocale, { timeZone: "UTC" }) })}
          </DialogTitle>
          <DialogDescription>{t("Wie viele Boulder pro Schwierigkeit?")}</DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map((grade) => (
                <div key={grade} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span className="text-sm font-medium">{t("Grad {grade}", { grade })}</span>
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
            {other > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("Außerdem an diesem Tag: {n} weitere Sends (Routen/andere Grade), die hier unverändert bleiben.", { n: other })}
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={!loaded || saving || (total === 0 && !hadExisting)}>
            {saving
              ? t("Speichern…")
              : total === 0 && hadExisting
                ? t("Tag leeren")
                : hadExisting
                  ? t("Änderungen speichern ({n} Boulder)", { n: total })
                  : t("{n} Boulder speichern", { n: total })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
