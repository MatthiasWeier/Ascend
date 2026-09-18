"use client";

import { useState } from "react";
import { Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computePlatesPerSide, defaultBarWeight } from "@/lib/plate-calculator";
import { useWeightUnit } from "@/components/weight-unit-context";

// targetWeightKg is always kg (canonical) - converted to the display unit
// here since kg and lbs use different standard plate sets and bar weights.
export function PlateCalculatorPopover({ targetWeightKg }: { targetWeightKg: number }) {
  const { unit, unitLabel, toDisplay } = useWeightUnit();
  const [bar, setBar] = useState(defaultBarWeight(unit));
  const target = toDisplay(targetWeightKg);
  const { plates, remainder, barOnly } = computePlatesPerSide(target, bar, unit);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" title="Hantelscheiben-Rechner" />
        }
      >
        <Disc3 className="size-4" />
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center gap-2">
          <Label htmlFor="plate-bar" className="text-xs text-muted-foreground">
            Stange
          </Label>
          <Input
            id="plate-bar"
            type="number"
            min={0}
            step={0.5}
            value={bar}
            onChange={(e) => setBar(Number(e.target.value) || 0)}
            className="h-7 w-16"
          />
          <span className="text-xs text-muted-foreground">{unitLabel}</span>
        </div>
        {barOnly ? (
          <p className="text-sm text-muted-foreground">
            {target}{unitLabel} liegt bei/unter dem Stangengewicht - keine Scheiben nötig.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Pro Seite:</p>
            <p className="text-sm font-medium">
              {plates.length > 0 ? plates.join(" + ") + ` ${unitLabel}` : "—"}
            </p>
            {remainder > 0 && (
              <p className="text-xs text-amber-500">
                {remainder}{unitLabel} pro Seite nicht exakt darstellbar mit Standard-Scheiben.
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
