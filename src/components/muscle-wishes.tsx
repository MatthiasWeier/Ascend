"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/locale-provider";
import { ALL_MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import type { Muscle } from "@prisma/client";

const LEVELS = [
  { value: 0, label: "Fine" },
  { value: 1, label: "More" },
  { value: 2, label: "Much more" },
];

// Per muscle: "fine as it is" / "train more" / "train much more". The Workout
// Brain suggests wished muscles more often.
export function MuscleWishes() {
  const t = useT();
  const [wishes, setWishes] = useState<Partial<Record<Muscle, number>> | null>(null);

  useEffect(() => {
    fetch("/api/muscle-preferences")
      .then((r) => r.json())
      .then((data: { preferences: { muscle: Muscle; wish: number }[] }) =>
        setWishes(Object.fromEntries(data.preferences.map((p) => [p.muscle, p.wish])))
      )
      .catch(() => setWishes({}));
  }, []);

  async function setWish(muscle: Muscle, wish: number) {
    const previous = wishes;
    setWishes((w) => ({ ...(w ?? {}), [muscle]: wish }));
    const res = await fetch("/api/muscle-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muscle, wish }),
    });
    if (!res.ok) {
      setWishes(previous);
      toast.error(t("Couldn't save."));
    }
  }

  if (wishes == null) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-1.5">
      {ALL_MUSCLES.map((m) => {
        const current = wishes[m] ?? 0;
        return (
          <div key={m} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1">
            <span className={cn("text-sm", current > 0 && "font-semibold text-primary")}>{t(MUSCLE_LABEL[m])}</span>
            <div className="flex gap-1" role="group" aria-label={t(MUSCLE_LABEL[m])}>
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  aria-pressed={current === l.value}
                  onClick={() => setWish(m, l.value)}
                  className={cn(
                    "min-h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                    current === l.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {t(l.label)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
