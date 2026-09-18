"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  type WeightUnit,
  kgToDisplay,
  displayToKg,
  formatWeight,
  unitLabel,
} from "@/lib/weight-units";

type WeightUnitContextValue = {
  unit: WeightUnit;
  unitLabel: string;
  setUnit: (unit: WeightUnit) => void;
  toDisplay: (kg: number) => number;
  toKg: (displayValue: number) => number;
  format: (kg: number | null | undefined) => string;
};

const WeightUnitContext = createContext<WeightUnitContextValue | null>(null);

export function WeightUnitProvider({
  initialUnit,
  children,
}: {
  initialUnit: WeightUnit;
  children: React.ReactNode;
}) {
  const [unit, setUnitState] = useState<WeightUnit>(initialUnit);

  const setUnit = useCallback((next: WeightUnit) => {
    setUnitState(next);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightUnit: next }),
    }).catch(() => {});
  }, []);

  const value = useMemo<WeightUnitContextValue>(
    () => ({
      unit,
      unitLabel: unitLabel(unit),
      setUnit,
      toDisplay: (kg: number) => kgToDisplay(kg, unit),
      toKg: (displayValue: number) => displayToKg(displayValue, unit),
      format: (kg: number | null | undefined) => formatWeight(kg, unit),
    }),
    [unit, setUnit]
  );

  return <WeightUnitContext.Provider value={value}>{children}</WeightUnitContext.Provider>;
}

export function useWeightUnit(): WeightUnitContextValue {
  const ctx = useContext(WeightUnitContext);
  if (!ctx) throw new Error("useWeightUnit must be used within WeightUnitProvider");
  return ctx;
}
