"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateExerciseDialog, type EditableExercise } from "@/components/create-exercise-dialog";
import { useLocale } from "@/components/locale-provider";
import { FOCUS_LABEL } from "@/lib/muscle-focus";

type Row = EditableExercise & { groupName: string | null };

// Settings list of the custom exercises the user may change or remove.
export function MyExercises() {
  const { t } = useLocale();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/exercises/mine")
      .then((r) => r.json())
      .then((data: { exercises: Row[] }) => setRows(data.exercises))
      .catch(() => setRows([]));
  }
  useEffect(load, []);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/exercises/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data: { error?: string; count?: number } = await res.json().catch(() => ({}));
      toast.error(
        data.count
          ? t("Sie steckt in {n} Sätzen. Lösche zuerst die betroffenen Workouts (oder ändere stattdessen die Art/den Namen).", { n: data.count })
          : t(data.error ?? "Konnte Übung nicht löschen.")
      );
      setDeleting(null);
      return;
    }
    toast.success(t("Übung gelöscht."));
    setDeleting(null);
    load();
  }

  if (rows == null) return <Skeleton className="h-16 w-full" />;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Du hast noch keine eigenen Übungen. Lege welche beim Workout-Eintragen an.")}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {rows.map((ex) => (
          <li key={ex.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{ex.name}</p>
              <p className="text-xs text-muted-foreground">
                {ex.type === "HOLD" ? t("Halten (Zeit)") : t("Wdh + Gewicht")} · {t(FOCUS_LABEL[ex.focus])}
                {ex.groupName && ` · ${t("Gruppe: {name}", { name: ex.groupName })}`}
                {ex.setCount > 0 && ` · ${t("{n} Sätze geloggt", { n: ex.setCount })}`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(ex)}>
              <Pencil className="size-3.5" />
              {t("Bearbeiten")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              title={t("Löschen")}
              aria-label={t("Löschen")}
              onClick={() => setDeleting(ex)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <CreateExerciseDialog key={editing.id} editing={editing} onEditClose={() => setEditing(null)} onSaved={load} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Übung löschen?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("\"{name}\" wird endgültig gelöscht und verschwindet aus deinen Vorlagen.", { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirmDelete}>
              {busy ? t("Löschen…") : t("Löschen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
