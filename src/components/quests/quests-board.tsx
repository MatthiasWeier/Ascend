"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "@/components/feed-list";
import { QuestCard } from "@/components/quests/quest-card";
import { QuestFormDialog } from "@/components/quests/quest-form-dialog";
import { useLocale } from "@/components/locale-provider";
import type { QuestDTO } from "@/lib/quests";

export function QuestsBoard() {
  const { t } = useLocale();
  const [quests, setQuests] = useState<QuestDTO[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestDTO | undefined>();

  const refetch = useCallback(() => {
    fetch("/api/quests")
      .then((r) => r.json())
      .then((data: { quests: QuestDTO[] }) => setQuests(data.quests))
      .catch(() => setQuests([]));
  }, []);

  useEffect(refetch, [refetch]);

  // One place for every mutation: call, surface a translated error, refresh.
  async function call(url: string, init: RequestInit, failMessage: string): Promise<boolean> {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? failMessage));
      return false;
    }
    refetch();
    return true;
  }

  function actionsFor(q: QuestDTO) {
    return {
      onToggleStep: (stepId: string, done: boolean) => {
        call(`/api/quests/${q.id}/steps/${stepId}`, { method: "PATCH", body: JSON.stringify({ done }) }, "Konnte nicht speichern.").then(
          (ok) => {
            const allDone = q.steps.every((s) => (s.id === stepId ? done : s.doneAt != null));
            if (ok && done && allDone && q.status === "ACTIVE") {
              toast.success(t("Alle Schritte geschafft - schließ die Sidequest ab!"));
            }
          }
        );
      },
      onAddStep: async (title: string) => {
        await call(`/api/quests/${q.id}/steps`, { method: "POST", body: JSON.stringify({ title }) }, "Konnte nicht speichern.");
      },
      onDeleteStep: (stepId: string) => {
        call(`/api/quests/${q.id}/steps/${stepId}`, { method: "DELETE" }, "Konnte nicht löschen.");
      },
      onMoveStep: (stepId: string, direction: "up" | "down") => {
        call(`/api/quests/${q.id}/steps/${stepId}`, { method: "PATCH", body: JSON.stringify({ move: direction }) }, "Konnte nicht speichern.");
      },
      onComplete: () => {
        call(`/api/quests/${q.id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) }, "Konnte nicht speichern.").then(
          (ok) => ok && toast.success(t("Sidequest geschafft - stark!"))
        );
      },
      onReopen: () => {
        call(`/api/quests/${q.id}`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }, "Konnte nicht speichern.");
      },
      onEdit: () => {
        setEditing(q);
        setFormOpen(true);
      },
      onDelete: () => {
        call(`/api/quests/${q.id}`, { method: "DELETE" }, "Konnte nicht löschen.").then(
          (ok) => ok && toast.success(t("Sidequest gelöscht."))
        );
      },
    };
  }

  const active = quests?.filter((q) => q.status === "ACTIVE") ?? [];
  const completed = quests?.filter((q) => q.status === "COMPLETED") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("Neue Sidequest")}
        </Button>
      </div>

      {quests == null ? (
        <Skeleton className="h-40 w-full" />
      ) : quests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("Noch keine Sidequest. Setz dir ein Ziel - z. B. \"Handstand lernen bis Ende 2026\".")}
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <FeedList>
              {active.map((q) => (
                <QuestCard key={q.id} quest={q} actions={actionsFor(q)} />
              ))}
            </FeedList>
          )}
          {completed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">{t("Geschafft")}</h2>
              <FeedList>
                {completed.map((q) => (
                  <QuestCard key={q.id} quest={q} actions={actionsFor(q)} />
                ))}
              </FeedList>
            </section>
          )}
        </>
      )}

      <QuestFormDialog open={formOpen} onOpenChange={setFormOpen} quest={editing} onSaved={refetch} />
    </div>
  );
}
