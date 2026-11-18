"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Flag, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useLocale } from "@/components/locale-provider";
import { daysBetweenDateKeys, todayGermanDateKey } from "@/lib/german-time";
import { MAX_STEPS_PER_QUEST, type QuestDTO } from "@/lib/quests";
import { cn } from "@/lib/utils";

export type QuestActions = {
  onToggleStep: (stepId: string, done: boolean) => void;
  onAddStep: (title: string) => Promise<void>;
  onDeleteStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: "up" | "down") => void;
  onComplete: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Passing `actions` makes the card editable (own quests); omitting it renders
// the read-only view teammates see in the group tab.
export function QuestCard({
  quest,
  owner,
  actions,
}: {
  quest: QuestDTO;
  owner?: { name: string; avatarUrl: string | null };
  actions?: QuestActions;
}) {
  const { t, dateLocale } = useLocale();
  const [newStep, setNewStep] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const completed = quest.status === "COMPLETED";
  const doneCount = quest.steps.filter((s) => s.doneAt).length;
  const total = quest.steps.length;
  const daysLeft = daysBetweenDateKeys(todayGermanDateKey(), quest.targetDateKey);
  const dateLabel = new Date(`${quest.targetDateKey}T12:00:00Z`).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let deadlineText: string;
  let deadlineTone = "text-muted-foreground";
  if (completed) {
    deadlineText = t("Completed!");
    deadlineTone = "text-emerald-500";
  } else if (daysLeft < 0) {
    deadlineText = t("Overdue");
    deadlineTone = "text-destructive";
  } else if (daysLeft === 0) {
    deadlineText = t("Deadline is today");
    deadlineTone = "text-amber-500";
  } else if (daysLeft === 1) {
    deadlineText = t("1 day left");
    deadlineTone = daysLeft <= 7 ? "text-amber-500" : deadlineTone;
  } else {
    deadlineText = t("{days} days left", { days: daysLeft });
    if (daysLeft <= 7) deadlineTone = "text-amber-500";
  }

  async function submitStep(e: React.FormEvent) {
    e.preventDefault();
    if (!actions || !newStep.trim()) return;
    setAdding(true);
    await actions.onAddStep(newStep.trim());
    setAdding(false);
    setNewStep("");
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", completed && "opacity-80")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary",
            completed ? "text-emerald-500" : "text-primary"
          )}
        >
          {completed ? <Check className="size-4" /> : <Flag className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{quest.title}</p>
          {owner && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="size-4">
                {owner.avatarUrl && <AvatarImage src={owner.avatarUrl} alt="" />}
                <AvatarFallback className="text-[8px]">{initials(owner.name)}</AvatarFallback>
              </Avatar>
              {owner.name}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("Until {date}", { date: dateLabel })} · <span className={deadlineTone}>{deadlineText}</span>
            {actions && !quest.sharedWithGroups && <> · {t("Only visible to you")}</>}
          </p>
          {quest.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quest.description}</p>}
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("{done}/{total} steps", { done: doneCount, total })}</span>
            <span>{Math.round((doneCount / total) * 100)}%</span>
          </div>
          <Progress value={Math.round((doneCount / total) * 100)} className="w-full" />
        </div>
      )}

      {total > 0 && (
        <ol className="mt-3 flex flex-col gap-1">
          {quest.steps.map((step, i) => {
            const done = step.doneAt != null;
            return (
              <li key={step.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                <button
                  type="button"
                  disabled={!actions}
                  onClick={() => actions?.onToggleStep(step.id, !done)}
                  aria-label={done ? t("Mark as open") : t("Mark as done")}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border text-muted-foreground",
                    actions && !done && "hover:border-primary"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </button>
                <span className={cn("min-w-0 flex-1 text-sm", done && "text-muted-foreground line-through")}>
                  {step.title}
                </span>
                {actions && (
                  <span className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === 0}
                      onClick={() => actions.onMoveStep(step.id, "up")}
                      aria-label={t("Move up")}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === total - 1}
                      onClick={() => actions.onMoveStep(step.id, "down")}
                      aria-label={t("Move down")}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => actions.onDeleteStep(step.id)}
                      aria-label={t("Delete step")}
                    >
                      <X className="size-4" />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {actions && !completed && total < MAX_STEPS_PER_QUEST && (
        <form onSubmit={submitStep} className="mt-3 flex gap-2">
          <Input
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            maxLength={80}
            placeholder={total === 0 ? t("First step of the progression (optional)") : t("Next step")}
          />
          <Button type="submit" size="icon" variant="secondary" disabled={adding || !newStep.trim()} aria-label={t("Add step")}>
            <Plus className="size-4" />
          </Button>
        </form>
      )}

      {actions && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {completed ? (
            <Button type="button" size="sm" variant="secondary" onClick={actions.onReopen}>
              <RotateCcw className="size-4" />
              {t("Reopen")}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={actions.onComplete}>
              <Check className="size-4" />
              {t("Complete")}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={actions.onEdit}>
            <Pencil className="size-4" />
            {t("Edit")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            {t("Delete")}
          </Button>
        </div>
      )}

      {actions && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete sidequest \"{title}\"?", { title: quest.title })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("The sidequest and all its steps will be permanently deleted. This can't be undone.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={actions.onDelete}>{t("Delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
