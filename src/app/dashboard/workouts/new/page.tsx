"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Plus, Check, Timer, X, Copy, BookmarkPlus, FolderOpen, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExerciseCombobox } from "@/components/exercise-combobox";
import { CreateExerciseDialog } from "@/components/create-exercise-dialog";
import { cn } from "@/lib/utils";
import { undoableAction } from "@/lib/undo-toast";
import { FOCUS_LABEL, ALL_FOCUSES } from "@/lib/muscle-focus";
import type { MuscleFocus, SetType } from "@prisma/client";
import { PlateCalculatorPopover } from "@/components/plate-calculator-popover";
import { WarmupCalculatorDialog } from "@/components/warmup-calculator-dialog";
import { useWeightUnit } from "@/components/weight-unit-context";
import { useT } from "@/components/locale-provider";
import { roundForDisplay } from "@/lib/weight-units";

type Exercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
  focus: MuscleFocus;
};

type LastValues = Record<
  string,
  { reps: number | null; weightKg: number | null; durationSec: number | null }
>;

type Template = { id: string; name: string; entries: { exerciseId: string }[] };

const SET_TYPE_LABEL: Record<SetType, string> = {
  WARMUP: "Warm-up",
  NORMAL: "Normal",
  DROP: "Dropsatz",
  FAILURE: "Failure",
};

type SetRow = {
  key: number;
  exerciseId: string;
  reps: string;
  // Despite the name (kept for minimal diff against the API's weightKg
  // field), this holds the raw typed value in whatever unit is currently
  // selected (kg or lbs) - converted to/from kg only at the kg-canonical
  // boundaries (API submit, and prefill from API responses which are
  // always kg). Never reformatted on every keystroke, so mid-typing
  // decimals (e.g. "82.") never get clobbered.
  weightKg: string;
  durationSec: string;
  setType: SetType;
  notes: string;
  notesExpanded: boolean;
  done: boolean;
};

let rowKey = 0;
const emptyRow = (exerciseId: string = ""): SetRow => ({
  key: rowKey++,
  exerciseId,
  reps: "",
  weightKg: "",
  durationSec: "",
  setType: "NORMAL",
  notes: "",
  notesExpanded: false,
  done: false,
});

const REST_PRESETS = [60, 90, 120, 180];

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatLastValue(
  last: { reps: number | null; weightKg: number | null; durationSec: number | null },
  format: (kg: number | null | undefined) => string,
  unitLabel: string
) {
  if (last.durationSec != null) {
    return last.weightKg ? `${last.durationSec}s @ ${format(last.weightKg)}${unitLabel}` : `${last.durationSec}s`;
  }
  return `${format(last.weightKg ?? 0)}${unitLabel} × ${last.reps ?? "-"}`;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSessionId = searchParams.get("edit");
  const weightUnit = useWeightUnit();
  const t = useT();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastValues, setLastValues] = useState<LastValues>({});
  const [rows, setRows] = useState<SetRow[]>([]);
  const [focusFatigue, setFocusFatigue] = useState<Partial<Record<MuscleFocus, number>>>({});
  const [skinCondition, setSkinCondition] = useState(1);
  const [trackSkin, setTrackSkin] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restPreset, setRestPreset] = useState(90);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [mostUsedExerciseIds, setMostUsedExerciseIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()) as Promise<{ exercises: Exercise[] }>,
      fetch("/api/exercises/last-values").then((r) => r.json()) as Promise<{
        lastValues: LastValues;
        mostUsedExerciseIds: string[];
      }>,
      fetch("/api/workout-templates").then((r) => r.json()) as Promise<{ templates: Template[] }>,
      editSessionId
        ? (fetch(`/api/workouts/${editSessionId}`).then((r) => r.json()) as Promise<{
            session?: {
              notes: string | null;
              perceivedExertion: number | null;
              skinCondition: number | null;
              sets: {
                exerciseId: string;
                reps: number | null;
                weightKg: number | null;
                durationSec: number | null;
                setType: SetType;
                notes: string | null;
              }[];
              focusFatigue: { focus: MuscleFocus; rating: number }[];
            };
          }>)
        : Promise.resolve(null),
    ]).then(([exercisesRes, lastValuesRes, templatesRes, editRes]) => {
      setExercises(exercisesRes.exercises);
      setLastValues(lastValuesRes.lastValues);
      setMostUsedExerciseIds(lastValuesRes.mostUsedExerciseIds);
      setTemplates(templatesRes.templates);

      if (editRes?.session) {
        const s = editRes.session;
        setNotes(s.notes ?? "");
        if (s.focusFatigue.length > 0) {
          setFocusFatigue(Object.fromEntries(s.focusFatigue.map((f) => [f.focus, f.rating])));
        } else if (s.perceivedExertion != null) {
          // Pre-migration session with no per-focus data - seed every
          // trained focus with the old single number as a starting point.
          const focuses = new Set(
            s.sets
              .map((set) => exercisesRes.exercises.find((e) => e.id === set.exerciseId)?.focus)
              .filter((f): f is MuscleFocus => f != null)
          );
          setFocusFatigue(Object.fromEntries(Array.from(focuses).map((f) => [f, s.perceivedExertion])));
        }
        if (s.skinCondition != null) {
          setTrackSkin(true);
          setSkinCondition(s.skinCondition);
        }
        setRows(
          s.sets.map((set) => ({
            key: rowKey++,
            exerciseId: set.exerciseId,
            reps: set.reps != null ? String(set.reps) : "",
            weightKg:
              set.weightKg != null
                ? String(roundForDisplay(weightUnit.toDisplay(set.weightKg), weightUnit.unit))
                : "",
            durationSec: set.durationSec != null ? String(set.durationSec) : "",
            setType: set.setType ?? "NORMAL",
            notes: set.notes ?? "",
            notesExpanded: !!set.notes,
            done: false,
          }))
        );
      } else {
        setRows([emptyRow()]);
      }
    });
  }, [editSessionId]);

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      toast.success(t("Pause vorbei - weiter geht's!"));
      setRestSecondsLeft(null);
      return;
    }
    const timer = setTimeout(() => setRestSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restSecondsLeft]);

  function handleExerciseCreated(newExercise: Exercise) {
    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
    setRows((prev) => [...prev, emptyRow(newExercise.id)]);
  }

  function exerciseFor(id: string) {
    return exercises.find((e) => e.id === id);
  }

  // Only the focuses actually present among the current rows get asked
  // about - training just Push today shouldn't prompt for Leg fatigue.
  const trainedFocuses = useMemo(() => {
    const present = new Set(
      rows.map((r) => exerciseFor(r.exerciseId)?.focus).filter((f): f is MuscleFocus => f != null)
    );
    return ALL_FOCUSES.filter((f) => present.has(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, exercises]);

  function fatigueFor(focus: MuscleFocus) {
    return focusFatigue[focus] ?? 5;
  }

  function setFatigue(focus: MuscleFocus, rating: number) {
    setFocusFatigue((prev) => ({ ...prev, [focus]: rating }));
  }

  function updateRow(key: number, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleExerciseChange(key: number, exerciseId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const last = lastValues[exerciseId];
        const patch: Partial<SetRow> = { exerciseId };
        // Auto-fill from the last time this exercise was logged - only into
        // fields the user hasn't already touched, so it never clobbers a
        // value someone's already typed.
        if (last) {
          if (r.reps === "" && last.reps != null) patch.reps = String(last.reps);
          if (r.weightKg === "" && last.weightKg != null)
            patch.weightKg = String(roundForDisplay(weightUnit.toDisplay(last.weightKg), weightUnit.unit));
          if (r.durationSec === "" && last.durationSec != null) patch.durationSec = String(last.durationSec);
        }
        return { ...r, ...patch };
      })
    );
  }

  // One tap adds a new set for this exercise, pre-filled from the last time
  // it was logged - same auto-fill as picking it from the combobox, just
  // without opening the combobox at all.
  function quickAddExercise(exerciseId: string) {
    const row = emptyRow(exerciseId);
    const last = lastValues[exerciseId];
    if (last) {
      if (last.reps != null) row.reps = String(last.reps);
      if (last.weightKg != null)
        row.weightKg = String(roundForDisplay(weightUnit.toDisplay(last.weightKg), weightUnit.unit));
      if (last.durationSec != null) row.durationSec = String(last.durationSec);
    }
    setRows((prev) => [...prev, row]);
  }

  function addRow() {
    if (exercises.length === 0) return;
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function insertWarmupSets(beforeKey: number, exerciseId: string, sets: { weightKg: number; reps: number }[]) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === beforeKey);
      if (idx === -1) return prev;
      const warmupRows = sets.map((s) => ({
        ...emptyRow(exerciseId),
        weightKg: String(roundForDisplay(weightUnit.toDisplay(s.weightKg), weightUnit.unit)),
        reps: String(s.reps),
        setType: "WARMUP" as SetType,
      }));
      const next = [...prev];
      next.splice(idx, 0, ...warmupRows);
      return next;
    });
  }

  function duplicateRow(key: number) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx === -1) return prev;
      // Same exercise + values, fresh key, not marked done - covers the
      // common case of logging several sets of the same exercise back to
      // back without retyping everything each time.
      const copy: SetRow = { ...prev[idx], key: rowKey++, done: false };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function loadTemplate(templateId: string | null) {
    const template = templates.find((tpl) => tpl.id === templateId);
    if (!template) return;
    setRows(
      template.entries.map((e) => {
        const row = emptyRow(e.exerciseId);
        const last = lastValues[e.exerciseId];
        if (last) {
          if (last.reps != null) row.reps = String(last.reps);
          if (last.weightKg != null)
            row.weightKg = String(roundForDisplay(weightUnit.toDisplay(last.weightKg), weightUnit.unit));
          if (last.durationSec != null) row.durationSec = String(last.durationSec);
        }
        return row;
      })
    );
    toast.success(t("Vorlage \"{name}\" geladen.", { name: template.name }));
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    const exerciseIds = rows.filter((r) => r.exerciseId).map((r) => r.exerciseId);
    if (exerciseIds.length === 0 || !templateName.trim()) return;
    setSavingTemplate(true);
    const res = await fetch("/api/workout-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), exerciseIds }),
    });
    setSavingTemplate(false);
    if (!res.ok) {
      toast.error(t("Konnte Vorlage nicht speichern."));
      return;
    }
    const data: { template: Template } = await res.json();
    setTemplates((prev) => [data.template, ...prev]);
    toast.success(t("Vorlage gespeichert!"));
    setSaveTemplateOpen(false);
    setTemplateName("");
  }

  function deleteTemplate(templateId: string) {
    const index = templates.findIndex((tpl) => tpl.id === templateId);
    if (index === -1) return;
    const template = templates[index];
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== templateId));
    undoableAction({
      message: t("Vorlage \"{name}\" gelöscht.", { name: template.name }),
      undoLabel: t("Rückgängig"),
      onCommit: () => {
        fetch(`/api/workout-templates/${templateId}`, { method: "DELETE" }).catch(() => {});
      },
      onUndo: () => {
        setTemplates((prev) => {
          const next = [...prev];
          next.splice(index, 0, template);
          return next;
        });
      },
    });
  }

  function markDone(key: number) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, done: !r.done } : r)));
    const row = rows.find((r) => r.key === key);
    if (!row?.done) {
      setRestSecondsLeft(restPreset);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.length === 0) return;
    if (rows.some((r) => !r.exerciseId)) {
      toast.error(t("Bitte für jeden Satz eine Übung wählen."));
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    const payload = {
      notes: notes || undefined,
      focusFatigue: trainedFocuses.map((focus) => ({ focus, rating: fatigueFor(focus) })),
      skinCondition: trackSkin ? skinCondition : undefined,
      sets: rows.map((r) => {
        const ex = exerciseFor(r.exerciseId);
        const common = {
          setType: r.setType,
          notes: r.notes.trim() || undefined,
        };
        if (ex?.type === "HOLD") {
          return {
            exerciseId: r.exerciseId,
            durationSec: Number(r.durationSec),
            weightKg: r.weightKg === "" ? undefined : weightUnit.toKg(Number(r.weightKg)),
            ...common,
          };
        }
        return {
          exerciseId: r.exerciseId,
          reps: Number(r.reps),
          weightKg: r.weightKg === "" ? 0 : weightUnit.toKg(Number(r.weightKg)),
          ...common,
        };
      }),
    };

    const res = await fetch(editSessionId ? `/api/workouts/${editSessionId}` : "/api/workouts", {
      method: editSessionId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    submittingRef.current = false;
    if (!res.ok) {
      toast.error(editSessionId ? t("Konnte Workout nicht aktualisieren.") : t("Konnte Workout nicht speichern."));
      return;
    }

    if (editSessionId) {
      toast.success(t("Workout aktualisiert!"));
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const data: { newPrExerciseNames?: string[]; autoSharedGroupNames?: string[] } = await res.json();
    toast.success(t("Workout gespeichert!"));
    for (const name of data.newPrExerciseNames ?? []) {
      toast(t("🏆 Neuer PR: {name}!", { name }), { duration: 5000 });
    }
    if (data.autoSharedGroupNames?.length) {
      toast(t("Automatisch geteilt in: {groups}", { groups: data.autoSharedGroupNames.join(", ") }));
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {editSessionId ? t("Workout bearbeiten") : t("Workout eintragen")}
      </h1>

      {restSecondsLeft !== null && (
        <div className="sticky top-2 z-30 mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="size-4 text-primary" />
            {t("Pause:")} <span className="font-mono tabular-nums">{formatMmSs(restSecondsLeft)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRestSecondsLeft((s) => (s ?? 0) + 15)}
            >
              +15s
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setRestSecondsLeft(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Sätze")}</CardTitle>
            <CardDescription>{t("Übung wählen, Werte eintragen. ✓ startet die Pause.")}</CardDescription>
            <CardAction className="flex items-center gap-1.5">
              {templates.length > 0 && (
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger size="sm" className="w-auto">
                    <FolderOpen className="size-3.5" />
                    <SelectValue placeholder={t("Vorlage laden")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(templates.length > 0 || manageTemplatesOpen) && (
                <Dialog open={manageTemplatesOpen} onOpenChange={setManageTemplatesOpen}>
                  <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" title={t("Vorlagen verwalten")} />}>
                    <Trash2 className="size-3.5" />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("Vorlagen verwalten")}</DialogTitle>
                      <DialogDescription>{t("Löschen lässt sich kurz danach rückgängig machen.")}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-1 py-2">
                      {templates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-secondary/50">
                          <span className="text-sm">{tpl.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteTemplate(tpl.id)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      {templates.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("Keine Vorlagen mehr.")}</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
                <DialogTrigger
                  render={<Button type="button" variant="outline" size="sm" disabled={!rows.some((r) => r.exerciseId)} />}
                >
                  <BookmarkPlus className="size-3.5" />
                  {t("Als Vorlage")}
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={saveTemplate}>
                    <DialogHeader>
                      <DialogTitle>{t("Als Vorlage speichern")}</DialogTitle>
                      <DialogDescription>
                        {t("Speichert die Übungs-Reihenfolge der aktuellen Sätze - Werte werden beim Laden wieder aus deiner letzten Session vorausgefüllt.")}
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      value={templateName}
                      onChange={(ev) => setTemplateName(ev.target.value)}
                      placeholder={t("z.B. Push Day")}
                      className="my-2"
                      required
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={savingTemplate}>
                        {savingTemplate ? t("Speichern…") : t("Speichern")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <CreateExerciseDialog onCreated={handleExerciseCreated} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{t("Pause:")}</span>
              {REST_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRestPreset(p)}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    restPreset === p
                      ? "bg-primary/15 font-medium text-primary"
                      : "hover:bg-secondary"
                  )}
                >
                  {p}s
                </button>
              ))}
            </div>
            {mostUsedExerciseIds.length > 0 && (
              <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 text-xs">
                <span className="shrink-0 text-muted-foreground">{t("Häufig:")}</span>
                {mostUsedExerciseIds.map((id) => {
                  const ex = exerciseFor(id);
                  if (!ex) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => quickAddExercise(id)}
                      className="shrink-0 rounded-full border border-border bg-secondary px-3.5 py-1.5 font-medium shadow-sm transition-all hover:bg-accent active:scale-95"
                    >
                      + {ex.name}
                    </button>
                  );
                })}
              </div>
            )}
            <>
              {rows.map((row) => {
                const ex = exerciseFor(row.exerciseId);
                const last = lastValues[row.exerciseId];
                return (
                  <div key={row.key} className="animate-in fade-in slide-in-from-top-2 overflow-hidden duration-200">
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                        row.done ? "border-success/40 bg-success/5" : "border-border bg-secondary/40"
                      )}
                    >
                      {last && (
                        <p className="text-xs text-muted-foreground">
                          {t("Letztes Mal:")} {formatLastValue(last, weightUnit.format, weightUnit.unitLabel)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <ExerciseCombobox
                          className="h-10"
                          exercises={exercises}
                          value={row.exerciseId}
                          onChange={(id) => handleExerciseChange(row.key, id)}
                        />

                        {ex?.type === "HOLD" ? (
                          <>
                            <Input
                              type="number"
                              min={1}
                              placeholder={t("Sek.")}
                              required
                              value={row.durationSec}
                              onChange={(e) => updateRow(row.key, { durationSec: e.target.value })}
                              className="h-10 w-24"
                            />
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              placeholder={`+${weightUnit.unitLabel}`}
                              title={t("Zusatzgewicht (optional)")}
                              value={row.weightKg}
                              onChange={(e) => updateRow(row.key, { weightKg: e.target.value })}
                              className="h-10 w-20"
                            />
                          </>
                        ) : (
                          <>
                            <Input
                              type="number"
                              min={1}
                              placeholder={t("Wdh")}
                              required
                              value={row.reps}
                              onChange={(e) => updateRow(row.key, { reps: e.target.value })}
                              className="h-10 w-20"
                            />
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              placeholder={weightUnit.unitLabel}
                              value={row.weightKg}
                              onChange={(e) => updateRow(row.key, { weightKg: e.target.value })}
                              className="h-10 w-20"
                            />
                            <PlateCalculatorPopover targetWeightKg={weightUnit.toKg(Number(row.weightKg) || 0)} />
                            <WarmupCalculatorDialog
                              targetWeightKg={weightUnit.toKg(Number(row.weightKg) || 0)}
                              targetReps={Number(row.reps) || 8}
                              onInsert={(sets) => insertWarmupSets(row.key, row.exerciseId, sets)}
                            />
                          </>
                        )}

                        <Select
                          value={row.setType}
                          onValueChange={(v) => updateRow(row.key, { setType: v as SetType })}
                        >
                          <SelectTrigger className="h-10! w-[116px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SET_TYPE_LABEL) as SetType[]).map((st) => (
                              <SelectItem key={st} value={st}>
                                {t(SET_TYPE_LABEL[st])}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "text-muted-foreground hover:text-foreground",
                            row.notesExpanded && "text-primary"
                          )}
                          onClick={() => updateRow(row.key, { notesExpanded: !row.notesExpanded })}
                          title={t("Notiz zu diesem Satz")}
                        >
                          <StickyNote className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          variant={row.done ? "default" : "outline"}
                          size="icon"
                          className={cn("ml-auto", row.done && "bg-success text-success-foreground hover:bg-success/90")}
                          onClick={() => markDone(row.key)}
                          title={t("Satz fertig - startet die Pause")}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => duplicateRow(row.key)}
                          disabled={!row.exerciseId}
                          title={t("Satz duplizieren")}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.key)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {row.notesExpanded && (
                        <Input
                          placeholder={t("Notiz zu diesem Satz (z.B. langsame Exzentrik)")}
                          value={row.notes}
                          onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                          className="text-sm"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </>
            <Button type="button" variant="outline" onClick={addRow} disabled={exercises.length === 0}>
              <Plus className="size-4" />
              {t("Satz hinzufügen")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Wie war's?")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {trainedFocuses.length > 0 && (
              <div className="flex flex-col gap-4">
                <Label>{t("Wie ausgelastet ist die Muskelgruppe?")}</Label>
                {trainedFocuses.map((focus) => (
                  <div key={focus} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t(FOCUS_LABEL[focus])}</span>
                      <span className="text-sm font-medium text-primary">{fatigueFor(focus)}/10</span>
                    </div>
                    <Slider
                      value={fatigueFor(focus)}
                      onValueChange={(v) => setFatigue(focus, v as number)}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTrackSkin((v) => !v)}
                className="w-fit text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {trackSkin ? t("Haut-Zustand ausblenden") : t("+ Haut-Zustand erfassen (Klettern)")}
              </button>
              {trackSkin && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label>{t("Haut-Zustand (10 = ruiniert)")}</Label>
                    <span className="text-sm font-medium text-primary">{skinCondition}/10</span>
                  </div>
                  <Slider
                    value={skinCondition}
                    onValueChange={(v) => setSkinCondition(v as number)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">{t("Notizen")}</Label>
              <Textarea
                id="notes"
                placeholder={t("Optional…")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={loading || rows.length === 0}>
          {loading ? t("Speichern…") : editSessionId ? t("Änderungen speichern") : t("Workout speichern")}
        </Button>
      </form>
    </div>
  );
}
