"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/locale-provider";

const FOCUS_OPTIONS = [
  { value: "PUSH", label: "Push" },
  { value: "PULL", label: "Pull" },
  { value: "LEGS", label: "Beine" },
  { value: "CORE", label: "Core" },
  { value: "GRIP", label: "Grip" },
];

type CreatedExercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
  focus: "PUSH" | "PULL" | "LEGS" | "CORE" | "GRIP";
};

export function CreateExerciseDialog({ onCreated }: { onCreated: (exercise: CreatedExercise) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"REPS" | "HOLD">("REPS");
  const [focus, setFocus] = useState<"PUSH" | "PULL" | "LEGS" | "CORE" | "GRIP">("PUSH");
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [groupId, setGroupId] = useState<string>("personal");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { groups: { id: string; name: string }[] }) => setGroups(data.groups));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        type,
        focus,
        isBodyweight,
        groupId: groupId === "personal" ? undefined : groupId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Konnte Übung nicht anlegen."));
      return;
    }
    const data: { exercise: CreatedExercise } = await res.json();
    toast.success(t("Übung angelegt!"));
    setName("");
    setDescription("");
    setOpen(false);
    onCreated(data.exercise);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Plus className="size-4" />
        {t("Neue Übung")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Neue Übung anlegen")}</DialogTitle>
          <DialogDescription>
            {t("Für dich persönlich, oder sichtbar für eine ganze Gruppe.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-name">{t("Name")}</Label>
            <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-desc">{t("Beschreibung")}</Label>
            <Textarea id="ex-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t("Art")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as "REPS" | "HOLD")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPS">{t("Wdh + Gewicht")}</SelectItem>
                  <SelectItem value="HOLD">{t("Halten (Zeit)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>{t("Fokus")}</Label>
              <Select value={focus} onValueChange={(v) => setFocus(v as typeof focus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {t(f.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ex-bw">{t("Bodyweight-Übung")}</Label>
              <p className="text-xs text-muted-foreground">{t("Körpergewicht fließt in Analytics/Power ein.")}</p>
            </div>
            <Switch id="ex-bw" checked={isBodyweight} onCheckedChange={setIsBodyweight} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("Sichtbarkeit")}</Label>
            <Select value={groupId} onValueChange={(v) => setGroupId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t("Nur für mich")}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {t("Gruppe: {name}", { name: g.name })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? t("Anlegen…") : t("Anlegen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
