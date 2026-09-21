"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BodyViewer, type BodyViewerHandle } from "@/components/body-viewer";
import { useT } from "@/components/locale-provider";
import { HEAT_COLORS } from "@/lib/body-model";
import { ALL_MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import type { Muscle } from "@prisma/client";

type MuscleData = {
  muscle: Muscle;
  perWeek: number;
  level: number;
  daysSince: number | null;
  wish: number;
  injured: boolean;
};

const WINDOWS = [7, 14, 30];
const LEVEL_LABEL = ["Kaum trainiert", "Wenig", "Mittel", "Viel", "Sehr viel"];
const WISHES = [
  { value: 0, label: "Passt" },
  { value: 1, label: "Mehr" },
  { value: 2, label: "Viel mehr" },
];

// The body map: 3D mannequin coloured by how much each muscle was trained
// (grey = barely, red = a lot), plus a list with the same data as a fallback
// and for reading exact numbers.
export function BodyView() {
  const t = useT();
  const viewer = useRef<BodyViewerHandle>(null);
  const [days, setDays] = useState(14);
  const [data, setData] = useState<MuscleData[] | null>(null);
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [webglMissing, setWebglMissing] = useState(false);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/body?days=${days}`)
      .then((r) => r.json())
      .then((res: { muscles: MuscleData[] }) => !cancelled && setData(res.muscles))
      .catch(() => !cancelled && setData([]));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const visuals = useMemo(
    () => (data ?? []).map((m) => ({ muscle: m.muscle, level: m.level, wish: m.wish, injured: m.injured })),
    [data]
  );
  const current = data?.find((m) => m.muscle === selected) ?? null;

  async function setWish(muscle: Muscle, wish: number) {
    const previous = data;
    setData((d) => d?.map((m) => (m.muscle === muscle ? { ...m, wish } : m)) ?? d);
    const res = await fetch("/api/muscle-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muscle, wish }),
    });
    if (!res.ok) {
      setData(previous);
      toast.error(t("Konnte nicht speichern."));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label={t("Zeitraum")}>
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={days === w}
              onClick={() => setDays(w)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                days === w
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
              )}
            >
              {t("{n} Tage", { n: w })}
            </button>
          ))}
        </div>
        {!webglMissing && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => viewer.current?.view("front")}>
              {t("Vorne")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => viewer.current?.view("back")}>
              {t("Hinten")}
            </Button>
            <Button
              variant={spinning ? "default" : "outline"}
              size="sm"
              aria-pressed={spinning}
              title={t("Automatisch drehen")}
              onClick={() => {
                viewer.current?.setAutoRotate(!spinning);
                setSpinning(!spinning);
              }}
            >
              <RotateCw className="size-4" />
              {t("Drehen")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-secondary/40 to-card">
          {webglMissing ? (
            <p className="flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {t("3D wird von diesem Browser nicht unterstützt - unten findest du alle Muskeln als Liste.")}
            </p>
          ) : data == null ? (
            <Skeleton className="h-[420px] w-full sm:h-[520px]" />
          ) : (
            <BodyViewer
              ref={viewer}
              className="h-[420px] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[520px]"
              visuals={visuals}
              selected={selected}
              onSelect={(m) => {
                setSelected(m);
                if (m) setSpinning(false);
              }}
              onUnavailable={() => setWebglMissing(true)}
              onInteract={() => setSpinning(false)}
            />
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            {HEAT_COLORS.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                <span className="size-3 rounded-sm" style={{ backgroundColor: c }} />
                {t(LEVEL_LABEL[i])}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-sm bg-blue-600" />
              {t("Wunsch")}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-sm bg-amber-500" />
              {t("Verletzung")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border p-4">
            {current ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-lg font-semibold">{t(MUSCLE_LABEL[current.muscle])}</p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="size-3 rounded-sm" style={{ backgroundColor: HEAT_COLORS[current.level - 1] }} />
                    {t(LEVEL_LABEL[current.level - 1])}
                  </p>
                </div>
                <p className="text-sm">
                  <b className="font-bold tabular-nums text-primary">{current.perWeek}</b> {t("gewichtete Sätze pro Woche")}
                  <br />
                  <span className="text-muted-foreground">
                    {current.daysSince == null
                      ? t("Noch nie trainiert.")
                      : current.daysSince === 0
                        ? t("Zuletzt: heute")
                        : current.daysSince === 1
                          ? t("Zuletzt: vor 1 Tag")
                          : t("Zuletzt: vor {n} Tagen", { n: current.daysSince })}
                  </span>
                </p>
                {current.injured && (
                  <p className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
                    {t("Von einer aktiven Verletzung betroffen.")}
                  </p>
                )}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("Wie zufrieden bist du?")}</p>
                  <div className="flex flex-wrap gap-1" role="group">
                    {WISHES.map((w) => (
                      <button
                        key={w.value}
                        type="button"
                        aria-pressed={current.wish === w.value}
                        onClick={() => setWish(current.muscle, w.value)}
                        className={cn(
                          "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                          current.wish === w.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {t(w.label)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t("\"Mehr\" bringt den Muskel öfter ins Workout Brain.")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("Tipp auf einen Muskel, um Details zu sehen und einen Wunsch zu setzen. Ziehen dreht den Körper.")}
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-1">
            {data == null
              ? null
              : ALL_MUSCLES.map((muscle) => {
                  const m = data.find((d) => d.muscle === muscle);
                  if (!m) return null;
                  return (
                    <li key={muscle}>
                      <button
                        type="button"
                        onClick={() => setSelected(selected === muscle ? null : muscle)}
                        aria-pressed={selected === muscle}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/60",
                          selected === muscle && "bg-secondary"
                        )}
                      >
                        <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: HEAT_COLORS[m.level - 1] }} />
                        <span className="flex-1">{t(MUSCLE_LABEL[muscle])}</span>
                        {m.wish > 0 && <span className="size-2 rounded-full bg-blue-600" title={t("Wunsch")} />}
                        {m.injured && <span className="size-2 rounded-full bg-amber-500" title={t("Verletzung")} />}
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{m.perWeek}</span>
                      </button>
                    </li>
                  );
                })}
          </ul>
        </div>
      </div>
    </div>
  );
}
