"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { BODY_PART_LABEL } from "@/lib/injuries";
import { cn } from "@/lib/utils";
import type { BodyPart, InjurySeverity } from "@prisma/client";

type Pending = { id: string; bodyPart: BodyPart; severity: InjurySeverity };

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

// Once per day per active injury: "still hurts? rate 1-10", or "healed".
// Self-fetching so it can drop into the feed without server wiring.
export function InjuryCheckinReminder() {
  const { t } = useLocale();
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/injuries/pending-checkin")
      .then((r) => r.json())
      .then((data: { pending: Pending[] }) => setPending(data.pending))
      .catch(() => setPending([]));
  }, []);

  async function answer(injuryId: string, painLevel: number) {
    setBusy(injuryId);
    const res = await fetch(`/api/injuries/${injuryId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ painLevel }),
    });
    setBusy(null);
    if (!res.ok) return toast.error(t("Couldn't save."));
    setPending((prev) => prev?.filter((p) => p.id !== injuryId) ?? null);
  }

  async function markHealed(injuryId: string) {
    setBusy(injuryId);
    const res = await fetch(`/api/injuries/${injuryId}`, { method: "PATCH" });
    setBusy(null);
    if (!res.ok) return toast.error(t("Couldn't save."));
    toast.success(t("Marked as healed."));
    setPending((prev) => prev?.filter((p) => p.id !== injuryId) ?? null);
  }

  if (!pending || pending.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      {pending.map((p) => (
        <div key={p.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4 shrink-0 text-amber-500" />
            <span className="font-medium">
              {t("{part}: Still hurts?", { part: t(BODY_PART_LABEL[p.bodyPart]) })}
            </span>
          </div>
          {picking === p.id ? (
            <div className="flex flex-wrap items-center gap-1.5 pl-6">
              <span className="text-xs text-muted-foreground">{t("Pain level:")}</span>
              {LEVELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => answer(p.id, n)}
                  className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums hover:border-amber-500 hover:text-amber-500"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicking(null)}
                className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t("Cancel")}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pl-6">
              <Button size="sm" variant="outline" className={cn(busy === p.id && "opacity-60")} disabled={busy === p.id} onClick={() => setPicking(p.id)}>
                {t("Yes, still hurts")}
              </Button>
              <Button size="sm" disabled={busy === p.id} onClick={() => markHealed(p.id)}>
                {t("No, healed")}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
