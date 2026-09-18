"use client";

import { useState } from "react";
import { Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { computePlatesPerSide, DEFAULT_BAR_KG } from "@/lib/plate-calculator";

export function PlateCalculatorPopover({ targetWeightKg }: { targetWeightKg: number }) {
  const [barKg, setBarKg] = useState(DEFAULT_BAR_KG);
  const { plates, remainderKg, barOnly } = computePlatesPerSide(targetWeightKg, barKg);

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
          <Label htmlFor="plate-bar-kg" className="text-xs text-muted-foreground">
            Stange
          </Label>
          <Input
            id="plate-bar-kg"
            type="number"
            min={0}
            step={0.5}
            value={barKg}
            onChange={(e) => setBarKg(Number(e.target.value) || 0)}
            className="h-7 w-16"
          />
          <span className="text-xs text-muted-foreground">kg</span>
        </div>
        {barOnly ? (
          <p className="text-sm text-muted-foreground">
            {targetWeightKg}kg liegt bei/unter dem Stangengewicht - keine Scheiben nötig.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Pro Seite:</p>
            <p className="text-sm font-medium">
              {plates.length > 0 ? plates.join(" + ") + " kg" : "—"}
            </p>
            {remainderKg > 0 && (
              <p className="text-xs text-amber-500">
                {remainderKg}kg pro Seite nicht exakt darstellbar mit Standard-Scheiben.
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
