"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/components/locale-provider";
import { BODY_PARTS, BODY_PART_LABEL, SEVERITIES, SEVERITY_LABEL, MUSCLE_BODY_PARTS } from "@/lib/injuries";
import { MUSCLE_LABEL } from "@/lib/muscles";
import type { BodyPart, InjurySeverity, Muscle } from "@prisma/client";

// Quick "report an injury" flow from the body map, pre-scoped to the body
// parts the tapped muscle actually loads - the full picker (any body part,
// past injuries, healing) lives in Settings.
export function ReportInjuryDialog({ muscle, onSaved }: { muscle: Muscle; onSaved: () => void }) {
  const t = useT();
  // ABS/OBLIQUES load no single joint - offer the full list for those.
  const options = MUSCLE_BODY_PARTS[muscle].length > 0 ? MUSCLE_BODY_PARTS[muscle] : BODY_PARTS;
  const [open, setOpen] = useState(false);
  const [bodyPart, setBodyPart] = useState<BodyPart>(options[0]);
  const [severity, setSeverity] = useState<InjurySeverity>("MODERATE");
  const [note, setNote] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/injuries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyPart, severity, note: note || undefined, endsAt: endsAt || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't save."));
      return;
    }
    toast.success(t("Injury saved."));
    setNote("");
    setEndsAt("");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10" />}>
        <TriangleAlert className="size-3.5" />
        {t("Report injury")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Report an injury for {muscle}", { muscle: t(MUSCLE_LABEL[muscle]) })}</DialogTitle>
          <DialogDescription>
            {t("Affected exercises get a warning while logging and (at moderate/severe) are dropped from the Workout Brain's suggestions. Other group members see this too.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {options.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("Where exactly?")}</Label>
              <Select value={bodyPart} onValueChange={(v) => setBodyPart(v as BodyPart)} items={options.map((p) => ({ value: p, label: t(BODY_PART_LABEL[p]) }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(BODY_PART_LABEL[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t("How bad?")}</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as InjurySeverity)} items={SEVERITIES.map((s) => ({ value: s, label: t(SEVERITY_LABEL[s]) }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(SEVERITY_LABEL[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rep-note">{t("Note (optional)")}</Label>
            <Textarea id="rep-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. tendon irritation, left")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rep-end">{t("Expected to be healed (optional)")}</Label>
            <Input id="rep-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Saving…") : t("Report")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
