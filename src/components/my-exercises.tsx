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
          ? t("It is used in {n} sets. Delete the affected workouts first (or change the type/name instead).", { n: data.count })
          : t(data.error ?? "Couldn't delete the exercise.")
      );
      setDeleting(null);
      return;
    }
    toast.success(t("Exercise deleted."));
    setDeleting(null);
    load();
  }

  if (rows == null) return <Skeleton className="h-16 w-full" />;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("You haven't created any exercises yet. Create some while logging a workout.")}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {rows.map((ex) => (
          <li key={ex.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{ex.name}</p>
              <p className="text-xs text-muted-foreground">
                {ex.type === "HOLD" ? t("Hold (time)") : t("Reps + weight")} · {t(FOCUS_LABEL[ex.focus])}
                {ex.groupName && ` · ${t("Group: {name}", { name: ex.groupName })}`}
                {ex.setCount > 0 && ` · ${t("{n} sets logged", { n: ex.setCount })}`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(ex)}>
              <Pencil className="size-3.5" />
              {t("Edit")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              title={t("Delete")}
              aria-label={t("Delete")}
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
            <AlertDialogTitle>{t("Delete exercise?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("\"{name}\" will be deleted for good and removed from your templates.", { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirmDelete}>
              {busy ? t("Deleting…") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
