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
import { ALL_MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import type { Muscle } from "@prisma/client";

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

export type EditableExercise = CreatedExercise & {
  description: string | null;
  isBodyweight: boolean;
  muscles: { muscle: Muscle; role: "PRIMARY" | "SECONDARY" }[];
  setCount: number;
};

// Creates a custom exercise - or, with `editing`, edits one (mount it with a
// key per exercise; the parent controls when it closes).
export function CreateExerciseDialog({
  onCreated,
  editing,
  onEditClose,
  onSaved,
}: {
  onCreated?: (exercise: CreatedExercise) => void;
  editing?: EditableExercise | null;
  onEditClose?: () => void;
  onSaved?: () => void;
}) {
  const t = useT();
  const isEdit = !!editing;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [type, setType] = useState<"REPS" | "HOLD">(editing?.type ?? "REPS");
  const [focus, setFocus] = useState<"PUSH" | "PULL" | "LEGS" | "CORE" | "GRIP">(editing?.focus ?? "PUSH");
  const [isBodyweight, setIsBodyweight] = useState(editing?.isBodyweight ?? false);
  const [groupId, setGroupId] = useState<string>("personal");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  // Tap a muscle: not trained -> primary -> secondary -> not trained.
  const [muscleRoles, setMuscleRoles] = useState<Partial<Record<Muscle, "PRIMARY" | "SECONDARY">>>(
    Object.fromEntries((editing?.muscles ?? []).map((m) => [m.muscle, m.role]))
  );

  function cycleMuscle(m: Muscle) {
    setMuscleRoles((prev) => {
      const next = { ...prev };
      if (!prev[m]) next[m] = "PRIMARY";
      else if (prev[m] === "PRIMARY") next[m] = "SECONDARY";
      else delete next[m];
      return next;
    });
  }

  useEffect(() => {
    if (!open || isEdit) return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { groups: { id: string; name: string }[] }) => setGroups(data.groups));
  }, [open, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const res = await fetch(`/api/exercises/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          type,
          focus,
          isBodyweight,
          primaryMuscles: ALL_MUSCLES.filter((m) => muscleRoles[m] === "PRIMARY"),
          secondaryMuscles: ALL_MUSCLES.filter((m) => muscleRoles[m] === "SECONDARY"),
        }),
      });
      setSaving(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(t(data.error ?? "Konnte Übung nicht speichern."));
        return;
      }
      const data: { convertedSets: number } = await res.json();
      toast.success(
        data.convertedSets > 0
          ? t("Übung gespeichert - {n} Sätze umgerechnet.", { n: data.convertedSets })
          : t("Übung gespeichert.")
      );
      onSaved?.();
      onEditClose?.();
      return;
    }
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        type,
        focus,
        isBodyweight,
        primaryMuscles: ALL_MUSCLES.filter((m) => muscleRoles[m] === "PRIMARY"),
        secondaryMuscles: ALL_MUSCLES.filter((m) => muscleRoles[m] === "SECONDARY"),
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
    setMuscleRoles({});
    setOpen(false);
    onCreated?.(data.exercise);
  }

  return (
    <Dialog open={isEdit || open} onOpenChange={(o) => (isEdit ? !o && onEditClose?.() : setOpen(o))}>
      {!isEdit && (
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <Plus className="size-4" />
          {t("Neue Übung")}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("Übung bearbeiten") : t("Neue Übung anlegen")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Änderungen gelten überall, wo die Übung verwendet wird.")
              : t("Für dich persönlich, oder sichtbar für eine ganze Gruppe.")}
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
              <Select
                items={[
                  { value: "REPS", label: t("Wdh + Gewicht") },
                  { value: "HOLD", label: t("Halten (Zeit)") },
                ]}
                value={type}
                onValueChange={(v) => setType(v as "REPS" | "HOLD")}
              >
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
              <Select
                items={FOCUS_OPTIONS.map((f) => ({ value: f.value, label: t(f.label) }))}
                value={focus}
                onValueChange={(v) => setFocus(v as typeof focus)}
              >
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

          {editing && type !== editing.type && editing.setCount > 0 && (
            <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-500">
              {type === "HOLD"
                ? t("Deine {n} bisherigen Sätze werden umgerechnet: aus Wiederholungen werden Sekunden.", { n: editing.setCount })
                : t("Deine {n} bisherigen Sätze werden umgerechnet: aus Sekunden werden Wiederholungen.", { n: editing.setCount })}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t("Trainierte Muskeln")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("Tippen: Hauptmuskel, nochmal: Nebenmuskel, nochmal: entfernen. Ohne Auswahl wird der Fokus verwendet.")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => cycleMuscle(m)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    muscleRoles[m] === "PRIMARY" && "border-primary bg-primary text-primary-foreground",
                    muscleRoles[m] === "SECONDARY" && "border-primary/50 bg-primary/15 text-primary",
                    !muscleRoles[m] && "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {t(MUSCLE_LABEL[m])}
                  {muscleRoles[m] === "PRIMARY" && " ●"}
                  {muscleRoles[m] === "SECONDARY" && " ○"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="ex-bw">{t("Bodyweight-Übung")}</Label>
              <p className="text-xs text-muted-foreground">{t("Körpergewicht fließt in Analytics/Power ein.")}</p>
            </div>
            <Switch id="ex-bw" checked={isBodyweight} onCheckedChange={setIsBodyweight} />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("Sichtbarkeit")}</Label>
              <Select
                items={[
                  { value: "personal", label: t("Nur für mich") },
                  ...groups.map((g) => ({ value: g.id, label: t("Gruppe: {name}", { name: g.name }) })),
                ]}
                value={groupId}
                onValueChange={(v) => setGroupId(v as string)}
              >
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
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? (isEdit ? t("Speichern…") : t("Anlegen…")) : isEdit ? t("Speichern") : t("Anlegen")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
