"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FOCUS_LABEL, ALL_FOCUSES } from "@/lib/muscle-focus";
import type { MuscleFocus } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";

type SettingsData = {
  user: { name: string; email: string; bodyWeightKg: number | null };
  balanceGoals: { focus: MuscleFocus; targetPercent: number }[];
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [bodyWeight, setBodyWeight] = useState("");
  const [goals, setGoals] = useState<Record<MuscleFocus, number>>({
    PUSH: 20,
    PULL: 20,
    LEGS: 20,
    CORE: 20,
    GRIP: 20,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res: SettingsData) => {
        setData(res);
        setBodyWeight(res.user.bodyWeightKg?.toString() ?? "");
        if (res.balanceGoals.length > 0) {
          const g = { ...goals };
          for (const goal of res.balanceGoals) g[goal.focus] = goal.targetPercent;
          setGoals(g);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goalSum = ALL_FOCUSES.reduce((sum, f) => sum + goals[f], 0);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyWeightKg: bodyWeight === "" ? null : Number(bodyWeight),
        balanceGoals: ALL_FOCUSES.map((focus) => ({ focus, targetPercent: goals[focus] })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Konnte Einstellungen nicht speichern.");
      return;
    }
    toast.success("Gespeichert!");
  }

  if (data == null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">{data.user.name} · {data.user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Körpergewicht</CardTitle>
          <CardDescription>
            Für eine faire Berechnung relativer Kraft (z.B. bei Klimmzügen).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Input
            type="number"
            min={20}
            max={300}
            step={0.1}
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">kg</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance-Ziele</CardTitle>
          <CardDescription>
            Deine Wunsch-Verteilung fürs Balance-Radar. Muss nicht exakt 100% ergeben.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {ALL_FOCUSES.map((focus) => (
            <div key={focus} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{FOCUS_LABEL[focus]}</Label>
                <span className="text-sm font-medium text-primary">{goals[focus]}%</span>
              </div>
              <Slider
                value={[goals[focus]]}
                onValueChange={(v) => setGoals((g) => ({ ...g, [focus]: (v as number[])[0] }))}
                min={0}
                max={100}
                step={5}
              />
            </div>
          ))}
          <p className={`text-xs ${goalSum === 100 ? "text-success" : "text-muted-foreground"}`}>
            Summe: {goalSum}%{goalSum === 100 ? " — perfekt" : ""}
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? "Speichern…" : "Speichern"}
      </Button>
    </div>
  );
}
