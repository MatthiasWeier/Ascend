"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Plus, Check, Timer, TriangleAlert, X, Copy, BookmarkPlus, FolderOpen, StickyNote, Camera } from "lucide-react";
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
import { useLocale } from "@/components/locale-provider";
import { roundForDisplay, displayToKg, type WeightUnit } from "@/lib/weight-units";
import {
  metersToDisplay,
  displayToMeters,
  roundForDisplay as roundDistanceForDisplay,
  distanceUnitLabel,
  type DistanceUnit,
} from "@/lib/distance-units";
import { BODY_PART_LABEL, injuryConflicts } from "@/lib/injuries";
import type { BodyPart, InjurySeverity } from "@prisma/client";
import { germanDateKey, todayGermanDateKey } from "@/lib/german-time";

type Exercise = {
  id: string;
  name: string;
  type: "REPS" | "HOLD";
  focus: MuscleFocus;
  isCardio: boolean;
  loadedParts?: BodyPart[];
};

type LastValues = Record<
  string,
  { reps: number | null; weightKg: number | null; durationSec: number | null; distanceMeters: number | null }
>;

type Template = { id: string; name: string; entries: { exerciseId: string }[] };

const SET_TYPE_LABEL: Record<SetType, string> = {
  WARMUP: "Warm-up",
  NORMAL: "Normal",
  DROP: "Drop set",
  FAILURE: "Failure",
};

// Drop set/failure are strength-training tags (reduce the weight and keep
// going / trained to the point you couldn't do another rep) - neither
// means anything for a duration-logged cardio set.
function availableSetTypes(ex: Exercise | undefined): SetType[] {
  const all = Object.keys(SET_TYPE_LABEL) as SetType[];
  return ex?.isCardio ? all.filter((st) => st === "WARMUP" || st === "NORMAL") : all;
}

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
  // Same raw-typed-value-in-current-unit pattern as weightKg, but for a
  // cardio exercise's distance (km or mi - see lib/distance-units.ts).
  // Only ever shown/used instead of weightKg, never alongside it.
  distance: string;
  durationUnit: DurationUnit;
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
  distance: "",
  durationUnit: "SEC",
  setType: "NORMAL",
  notes: "",
  notesExpanded: false,
  done: false,
});

const REST_PRESETS = [60, 90, 120, 180];
const MAX_PHOTOS = 10;

// Snapshot of the whole form, saved server-side as the "draft" so the entry
// survives the phone killing the tab while another app is in front. Weights
// in `rows` are in `unit` (the raw typed values), converted on restore if
// the unit changed in the meantime.
type DraftData = {
  unit: WeightUnit;
  date: string;
  rows: SetRow[];
  focusFatigue: Partial<Record<MuscleFocus, number>>;
  skinCondition: number;
  trackSkin: boolean;
  notes: string;
  photoIds: string[];
};

function isMeaningfulDraft(d: DraftData) {
  return (
    d.rows.some((r) => r.exerciseId || r.reps || r.weightKg || r.durationSec || r.distance || r.notes) ||
    d.notes.trim() !== "" ||
    d.photoIds.length > 0
  );
}

function formatMmSs(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type DurationUnit = "SEC" | "MIN";

// Duration is always stored/submitted in seconds; these only convert at
// the display boundary, same pattern as weightKg/distance - just without
// a global preference, since the right unit depends on the exercise (a
// 60-minute swim vs. a 15-second sprint) rather than the user's locale.
function formatDurationForUnit(seconds: number, unit: DurationUnit): string {
  return unit === "MIN" ? String(Math.round((seconds / 60) * 100) / 100) : String(seconds);
}

function durationToSeconds(value: string, unit: DurationUnit): number {
  const n = Number(value);
  return unit === "MIN" ? Math.round(n * 60) : Math.round(n);
}

function formatLastValue(
  last: { reps: number | null; weightKg: number | null; durationSec: number | null; distanceMeters: number | null },
  isCardio: boolean,
  durationUnit: DurationUnit,
  weight: { format: (kg: number | null | undefined) => string; unitLabel: string },
  distance: { format: (m: number | null | undefined) => string; unitLabel: string }
) {
  if (last.durationSec != null) {
    const durationText = `${formatDurationForUnit(last.durationSec, durationUnit)}${durationUnit === "MIN" ? "min" : "s"}`;
    if (isCardio) {
      return last.distanceMeters != null
        ? `${durationText}, ${distance.format(last.distanceMeters)}${distance.unitLabel}`
        : durationText;
    }
    return last.weightKg ? `${durationText} @ ${weight.format(last.weightKg)}${weight.unitLabel}` : durationText;
  }
  return `${weight.format(last.weightKg ?? 0)}${weight.unitLabel} × ${last.reps ?? "-"}`;
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSessionId = searchParams.get("edit");
  const weightUnit = useWeightUnit();
  const { t, dateLocale } = useLocale();
  // No separate distance-unit setting - LBS users see miles, KG users see
  // km, same signal the weight preference already carries.
  const distanceUnit = useMemo(() => {
    const unit: DistanceUnit = weightUnit.unit === "LBS" ? "MI" : "KM";
    return {
      unit,
      unitLabel: distanceUnitLabel(unit),
      toDisplay: (m: number) => metersToDisplay(m, unit),
      toMeters: (displayValue: number) => displayToMeters(displayValue, unit),
      format: (m: number | null | undefined) => (m == null ? "0" : String(roundDistanceForDisplay(metersToDisplay(m, unit)))),
    };
  }, [weightUnit.unit]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastValues, setLastValues] = useState<LastValues>({});
  const [rows, setRows] = useState<SetRow[]>([]);
  const [date, setDate] = useState(todayGermanDateKey());
  const [focusFatigue, setFocusFatigue] = useState<Partial<Record<MuscleFocus, number>>>({});
  const [skinCondition, setSkinCondition] = useState(1);
  const [trackSkin, setTrackSkin] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);
  const hasDraftRef = useRef(false);
  const draftReadyRef = useRef(false);
  const latestDraftRef = useRef<DraftData | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ id: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);

  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restPreset, setRestPreset] = useState(90);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [mostUsedExerciseIds, setMostUsedExerciseIds] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<{ bodyPart: BodyPart; severity: InjurySeverity }[]>([]);

  useEffect(() => {
    fetch("/api/injuries")
      .then((r) => r.json())
      .then((data: { injuries: { bodyPart: BodyPart; severity: InjurySeverity }[] }) => setInjuries(data.injuries))
      .catch(() => {});
  }, []);

  const hitsFor = (e: Exercise | undefined) => (e?.loadedParts ? injuryConflicts(e.loadedParts, injuries) : []);

  // restoreDraft is declared here (not further down) so it's defined
  // before this effect calls it - react-hooks/immutability wants that
  // order even though plain JS function hoisting already made it work.
  function restoreDraft(d: DraftData, updatedAt: string) {
    const convert = (value: string) => {
      const n = Number(value);
      if (value === "" || isNaN(n) || d.unit === weightUnit.unit) return value;
      return String(roundForDisplay(weightUnit.toDisplay(displayToKg(n, d.unit)), weightUnit.unit));
    };
    const convertDistance = (value: string) => {
      const n = Number(value);
      if (!value || isNaN(n) || d.unit === weightUnit.unit) return value;
      const oldUnit: DistanceUnit = d.unit === "LBS" ? "MI" : "KM";
      return String(roundDistanceForDisplay(distanceUnit.toDisplay(displayToMeters(n, oldUnit))));
    };
    setRows(
      d.rows.length > 0
        ? d.rows.map((r) => ({
            ...r,
            key: rowKey++,
            weightKg: convert(r.weightKg),
            distance: convertDistance(r.distance ?? ""),
            durationUnit: r.durationUnit ?? "SEC",
          }))
        : [emptyRow()]
    );
    setDate(d.date && d.date <= todayGermanDateKey() ? d.date : todayGermanDateKey());
    setFocusFatigue(d.focusFatigue ?? {});
    setSkinCondition(d.skinCondition ?? 1);
    setTrackSkin(!!d.trackSkin);
    setNotes(d.notes ?? "");
    setPhotos((d.photoIds ?? []).map((id) => ({ id })));
    setDraftRestoredAt(updatedAt);
    hasDraftRef.current = true;
  }

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
              date: string;
              notes: string | null;
              perceivedExertion: number | null;
              skinCondition: number | null;
              sets: {
                exerciseId: string;
                reps: number | null;
                weightKg: number | null;
                durationSec: number | null;
                distanceMeters: number | null;
                setType: SetType;
                notes: string | null;
              }[];
              focusFatigue: { focus: MuscleFocus; rating: number }[];
              photos?: { id: string }[];
            };
          }>)
        : Promise.resolve(null),
      editSessionId
        ? Promise.resolve(null)
        : (fetch("/api/workouts/draft")
            .then((r) => r.json())
            .catch(() => null) as Promise<{ draft: { data: DraftData; updatedAt: string } | null } | null>),
    ]).then(([exercisesRes, lastValuesRes, templatesRes, editRes, draftRes]) => {
      setExercises(exercisesRes.exercises);
      setLastValues(lastValuesRes.lastValues);
      setMostUsedExerciseIds(lastValuesRes.mostUsedExerciseIds);
      setTemplates(templatesRes.templates);

      if (editRes?.session) {
        const s = editRes.session;
        setDate(germanDateKey(new Date(s.date)));
        setNotes(s.notes ?? "");
        setPhotos(s.photos ?? []);
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
            durationUnit:
              (exercisesRes.exercises.find((e) => e.id === set.exerciseId)?.isCardio ? "MIN" : "SEC") as DurationUnit,
            durationSec:
              set.durationSec != null
                ? formatDurationForUnit(
                    set.durationSec,
                    exercisesRes.exercises.find((e) => e.id === set.exerciseId)?.isCardio ? "MIN" : "SEC"
                  )
                : "",
            distance:
              set.distanceMeters != null ? String(roundDistanceForDisplay(distanceUnit.toDisplay(set.distanceMeters))) : "",
            setType: set.setType ?? "NORMAL",
            notes: set.notes ?? "",
            notesExpanded: !!set.notes,
            done: false,
          }))
        );
      } else if (draftRes?.draft && isMeaningfulDraft(draftRes.draft.data)) {
        restoreDraft(draftRes.draft.data, draftRes.draft.updatedAt);
      } else {
        setRows([emptyRow()]);
      }
      setDraftReady(true);
    });
  }, [editSessionId]);

  // react-hooks/refs (React Compiler readiness rule): these ref writes were
  // flagged when `pnpm lint` was first actually run against this file (it
  // was never part of the deploy workflow before, only `pnpm build`). Moved
  // into their own effect - runs after every render same as before, just
  // post-commit instead of mid-render, which only matters for code reading
  // .current synchronously during the SAME render, and nothing here does.
  useEffect(() => {
    latestDraftRef.current = {
      unit: weightUnit.unit,
      date,
      rows,
      focusFatigue,
      skinCondition,
      trackSkin,
      notes,
      photoIds: photos.map((p) => p.id),
    };
    draftReadyRef.current = draftReady;
  });

  // Autosave: shortly after any change, and immediately when the tab goes to
  // the background (visibilitychange/pagehide via sendBeacon) - that's the
  // moment a phone is most likely to kill the page.
  useEffect(() => {
    if (!draftReady || editSessionId) return;
    const timer = setTimeout(async () => {
      if (submittedRef.current || !latestDraftRef.current) return;
      const d = latestDraftRef.current;
      if (isMeaningfulDraft(d)) {
        hasDraftRef.current = true;
        await fetch("/api/workouts/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(d),
          keepalive: true,
        }).catch(() => {});
      } else if (hasDraftRef.current) {
        hasDraftRef.current = false;
        await fetch("/api/workouts/draft", { method: "DELETE" }).catch(() => {});
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [rows, date, focusFatigue, skinCondition, trackSkin, notes, photos, draftReady, editSessionId]);

  useEffect(() => {
    if (editSessionId) return;
    function flush() {
      const d = latestDraftRef.current;
      if (!draftReadyRef.current || submittedRef.current || !d || !isMeaningfulDraft(d)) return;
      navigator.sendBeacon("/api/workouts/draft", new Blob([JSON.stringify(d)], { type: "application/json" }));
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [editSessionId]);

  async function discardDraft() {
    const ids = photos.map((p) => p.id);
    setRows([emptyRow()]);
    setDate(todayGermanDateKey());
    setNotes("");
    setFocusFatigue({});
    setSkinCondition(1);
    setTrackSkin(false);
    setPhotos([]);
    setDraftRestoredAt(null);
    hasDraftRef.current = false;
    await fetch("/api/workouts/draft", { method: "DELETE" }).catch(() => {});
    await Promise.all(ids.map((id) => fetch(`/api/workout-photos/${id}`, { method: "DELETE" }).catch(() => {})));
  }

  async function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingPhotos(true);
    let count = photos.length;
    for (const file of files) {
      if (count >= MAX_PHOTOS) {
        toast.error(t("Maximum 10 photos per workout."));
        break;
      }
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/workout-photos", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(t(data.error ?? "Couldn't upload the photo."));
        continue;
      }
      const data: { photo: { id: string } } = await res.json();
      setPhotos((prev) => [...prev, { id: data.photo.id }]);
      count++;
    }
    setUploadingPhotos(false);
  }

  async function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/workout-photos/${id}`, { method: "DELETE" }).catch(() => {});
  }

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      toast.success(t("Rest over - let's go!"));
      setRestSecondsLeft(null);
      return;
    }
    const timer = setTimeout(() => setRestSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restSecondsLeft]);

  function handleExerciseCreated(newExercise: Omit<Exercise, "isCardio">) {
    // Custom exercises created from this dialog are never cardio - that
    // flag only exists on the seeded defaults for now.
    setExercises((prev) =>
      [...prev, { ...newExercise, isCardio: false }].sort((a, b) => a.name.localeCompare(b.name))
    );
    setRows((prev) => [...prev, emptyRow(newExercise.id)]);
  }

  function exerciseFor(id: string) {
    return exercises.find((e) => e.id === id);
  }

  // Shared "fill in the last logged values for this exercise" used by the
  // exercise combobox, the quick-add chips, and template loading - only
  // ever into fields the row doesn't already have a value in. A cardio
  // exercise skips weight (it shows distance instead) and defaults
  // duration to minutes; everything else keeps seconds/weight.
  function applyLastValues(row: SetRow, ex: Exercise | undefined, last: LastValues[string] | undefined): SetRow {
    const next = { ...row };
    if (next.durationSec === "") next.durationUnit = ex?.isCardio ? "MIN" : "SEC";
    if (!last) return next;
    if (next.reps === "" && last.reps != null) next.reps = String(last.reps);
    if (!ex?.isCardio && next.weightKg === "" && last.weightKg != null)
      next.weightKg = String(roundForDisplay(weightUnit.toDisplay(last.weightKg), weightUnit.unit));
    if (next.durationSec === "" && last.durationSec != null)
      next.durationSec = formatDurationForUnit(last.durationSec, next.durationUnit);
    if (ex?.isCardio && next.distance === "" && last.distanceMeters != null)
      next.distance = String(roundDistanceForDisplay(distanceUnit.toDisplay(last.distanceMeters)));
    return next;
  }

  function toggleDurationUnit(key: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const nextUnit: DurationUnit = r.durationUnit === "MIN" ? "SEC" : "MIN";
        if (r.durationSec === "") return { ...r, durationUnit: nextUnit };
        const seconds = durationToSeconds(r.durationSec, r.durationUnit);
        return { ...r, durationUnit: nextUnit, durationSec: formatDurationForUnit(seconds, nextUnit) };
      })
    );
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
        const newEx = exerciseFor(exerciseId);
        // Drop set/failure are strength-training tags that don't apply to
        // a cardio exercise - reset rather than carry over silently.
        const base = { ...r, exerciseId, setType: newEx?.isCardio && (r.setType === "DROP" || r.setType === "FAILURE") ? ("NORMAL" as SetType) : r.setType };
        return applyLastValues(base, newEx, lastValues[exerciseId]);
      })
    );
  }

  // One tap adds a new set for this exercise, pre-filled from the last time
  // it was logged - same auto-fill as picking it from the combobox, just
  // without opening the combobox at all.
  function quickAddExercise(exerciseId: string) {
    const ex = exerciseFor(exerciseId);
    const row = applyLastValues(emptyRow(exerciseId), ex, lastValues[exerciseId]);
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
      template.entries.map((e) =>
        applyLastValues(emptyRow(e.exerciseId), exerciseFor(e.exerciseId), lastValues[e.exerciseId])
      )
    );
    toast.success(t("Template \"{name}\" loaded.", { name: template.name }));
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
      toast.error(t("Couldn't save the template."));
      return;
    }
    const data: { template: Template } = await res.json();
    setTemplates((prev) => [data.template, ...prev]);
    toast.success(t("Template saved!"));
    setSaveTemplateOpen(false);
    setTemplateName("");
  }

  function deleteTemplate(templateId: string) {
    const index = templates.findIndex((tpl) => tpl.id === templateId);
    if (index === -1) return;
    const template = templates[index];
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== templateId));
    undoableAction({
      message: t("Template \"{name}\" deleted.", { name: template.name }),
      undoLabel: t("Undo"),
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
      toast.error(t("Please pick an exercise for every set."));
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    const payload = {
      date,
      photoIds: photos.map((p) => p.id),
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
            durationSec: durationToSeconds(r.durationSec, r.durationUnit),
            weightKg: ex.isCardio || r.weightKg === "" ? undefined : weightUnit.toKg(Number(r.weightKg)),
            distanceMeters: ex.isCardio && r.distance !== "" ? distanceUnit.toMeters(Number(r.distance)) : undefined,
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
      toast.error(editSessionId ? t("Couldn't update the workout.") : t("Couldn't save the workout."));
      return;
    }

    submittedRef.current = true;
    if (!editSessionId) await fetch("/api/workouts/draft", { method: "DELETE" }).catch(() => {});

    if (editSessionId) {
      toast.success(t("Workout updated!"));
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const data: { newPrExerciseNames?: string[]; autoSharedGroupNames?: string[] } = await res.json();
    toast.success(t("Workout saved!"));
    for (const name of data.newPrExerciseNames ?? []) {
      toast(t("🏆 New PR: {name}!", { name }), { duration: 5000 });
    }
    if (data.autoSharedGroupNames?.length) {
      toast(t("Automatically shared in: {groups}", { groups: data.autoSharedGroupNames.join(", ") }));
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {editSessionId ? t("Edit workout") : t("Log workout")}
        </h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="workout-date" className="text-sm text-muted-foreground">
            {t("Date")}
          </Label>
          <Input
            id="workout-date"
            type="date"
            value={date}
            max={todayGermanDateKey()}
            onChange={(e) => {
              // `max` only constrains the native picker widget - typing a
              // date directly (or some browsers' calendar popups) can
              // still fire onChange with a future value, so clamp it here
              // too instead of trusting the attribute alone.
              const value = e.target.value;
              const today = todayGermanDateKey();
              setDate(!value ? today : value > today ? today : value);
            }}
            className="w-auto"
          />
        </div>
      </div>

      {restSecondsLeft !== null && (
        <div className="sticky top-2 z-30 mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="size-4 text-primary" />
            {t("Rest:")} <span className="font-mono tabular-nums">{formatMmSs(restSecondsLeft)}</span>
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

      {draftRestoredAt && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
          <span>
            {t("Draft restored ({time})", {
              time: new Date(draftRestoredAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }),
            })}
          </span>
          <button type="button" onClick={discardDraft} className="font-medium text-primary hover:underline">
            {t("Discard")}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Sets")}</CardTitle>
            <CardDescription>{t("Pick an exercise, enter values. \"Set & rest\" starts the rest timer.")}</CardDescription>
            <CardAction className="flex items-center gap-1.5">
              {templates.length > 0 && (
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger size="sm" className="w-auto">
                    <FolderOpen className="size-3.5" />
                    <SelectValue placeholder={t("Load template")} />
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
                  <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" title={t("Manage templates")} />}>
                    <Trash2 className="size-3.5" />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("Manage templates")}</DialogTitle>
                      <DialogDescription>{t("Deleting can be undone for a moment.")}</DialogDescription>
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
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("No templates left.")}</p>
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
                  {t("As template")}
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={saveTemplate}>
                    <DialogHeader>
                      <DialogTitle>{t("Save as template")}</DialogTitle>
                      <DialogDescription>
                        {t("Saves the exercise order of the current sets - values are prefilled from your last session when loading.")}
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      value={templateName}
                      onChange={(ev) => setTemplateName(ev.target.value)}
                      placeholder={t("e.g. Push Day")}
                      className="my-2"
                      required
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={savingTemplate}>
                        {savingTemplate ? t("Saving…") : t("Save")}
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
              <span>{t("Rest:")}</span>
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
                <span className="shrink-0 text-muted-foreground">{t("Frequent:")}</span>
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
                      {hitsFor(ex).length > 0 && (
                        <p className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
                          <TriangleAlert className="size-3.5 shrink-0" />
                          {t("Loads your injury: {parts}", {
                            parts: hitsFor(ex).map((i) => t(BODY_PART_LABEL[i.bodyPart])).join(", "),
                          })}
                        </p>
                      )}
                      {last && (
                        <p className="text-xs text-muted-foreground">
                          {t("Last time:")} {formatLastValue(last, ex?.isCardio ?? false, row.durationUnit, weightUnit, distanceUnit)}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <ExerciseCombobox
                          className="h-10"
                          exercises={exercises.map((e) => ({ id: e.id, name: e.name, warn: hitsFor(e).length > 0 }))}
                          value={row.exerciseId}
                          onChange={(id) => handleExerciseChange(row.key, id)}
                        />

                        {ex?.type === "HOLD" ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={row.durationUnit === "MIN" ? 0.1 : 1}
                                step={row.durationUnit === "MIN" ? 0.1 : 1}
                                placeholder={t("Duration")}
                                required
                                value={row.durationSec}
                                onChange={(e) => updateRow(row.key, { durationSec: e.target.value })}
                                className="h-10 w-20"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 px-2 text-xs"
                                onClick={() => toggleDurationUnit(row.key)}
                                title={t("Switch between seconds and minutes")}
                              >
                                {row.durationUnit === "MIN" ? t("min") : t("sec")}
                              </Button>
                            </div>
                            {ex.isCardio ? (
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder={distanceUnit.unitLabel}
                                title={t("Distance (optional)")}
                                value={row.distance}
                                onChange={(e) => updateRow(row.key, { distance: e.target.value })}
                                className="h-10 w-20"
                              />
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step={0.5}
                                placeholder={`+${weightUnit.unitLabel}`}
                                title={t("Added weight (optional)")}
                                value={row.weightKg}
                                onChange={(e) => updateRow(row.key, { weightKg: e.target.value })}
                                className="h-10 w-20"
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <Input
                              type="number"
                              min={1}
                              placeholder={t("Reps")}
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
                          items={availableSetTypes(ex).map((st) => ({ value: st, label: t(SET_TYPE_LABEL[st]) }))}
                        >
                          <SelectTrigger className="h-10! w-[116px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSetTypes(ex).map((st) => (
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
                            "size-10 text-muted-foreground hover:text-foreground",
                            row.notesExpanded && "text-primary"
                          )}
                          onClick={() => updateRow(row.key, { notesExpanded: !row.notesExpanded })}
                          title={t("Note for this set")}
                        >
                          <StickyNote className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          variant={row.done ? "default" : "outline"}
                          className={cn("ml-auto h-10 gap-1.5 px-3", row.done && "bg-success text-success-foreground hover:bg-success/90")}
                          onClick={() => markDone(row.key)}
                          title={t("Set done - starts the rest timer")}
                        >
                          <Check className="size-4" />
                          {row.done ? t("Done") : t("Set & rest")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 text-muted-foreground hover:text-foreground"
                          onClick={() => duplicateRow(row.key)}
                          disabled={!row.exerciseId}
                          title={t("Duplicate set")}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 text-muted-foreground hover:text-destructive"
                          onClick={() => removeRow(row.key)}
                          title={t("Remove set")}
                          aria-label={t("Remove set")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {row.notesExpanded && (
                        <Input
                          placeholder={t("Note for this set (e.g. slow eccentric)")}
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
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full border-dashed border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={addRow}
              disabled={exercises.length === 0}
            >
              <Plus className="size-4" />
              {t("Add set")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Pump pics")}</CardTitle>
            <CardDescription>
              {t("Photos for this workout - visible to you and to the groups you share it in.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated proxy route */}
                    <img
                      src={`/api/workout-photos/${p.id}`}
                      alt={t("Pump pic")}
                      className="h-28 w-auto max-w-full rounded-lg border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label={t("Remove photo")}
                      className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handlePhotoFiles}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingPhotos || photos.length >= MAX_PHOTOS}
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="size-4" />
                {uploadingPhotos ? t("Uploading…") : t("Add photo")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("How was it?")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {trainedFocuses.length > 0 && (
              <div className="flex flex-col gap-4">
                <Label>{t("How fatigued is the muscle group?")}</Label>
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
                {trackSkin ? t("Hide skin condition") : t("+ Track skin condition (climbing)")}
              </button>
              {trackSkin && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label>{t("Skin condition (10 = wrecked)")}</Label>
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
              <Label htmlFor="notes">{t("Notes")}</Label>
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
          {loading ? t("Saving…") : editSessionId ? t("Save changes") : t("Save workout")}
        </Button>
      </form>
    </div>
  );
}
