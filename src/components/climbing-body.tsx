"use client";

import { BoldNumbers } from "@/components/bold-numbers";
import { useT } from "@/components/locale-provider";
import { climbingTotal, parseClimbingContent, sortedBoulderGrades } from "@/lib/climbing-summary";
import { cn } from "@/lib/utils";

// A shared climbing day: total sends up front, grade breakdown as chips.
export function ClimbingBody({ content, className }: { content: string | null; className?: string }) {
  const t = useT();
  const summary = parseClimbingContent(content);
  const total = climbingTotal(summary);
  return (
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <p className="text-foreground/80">
        <BoldNumbers text={total === 1 ? t("1 Send") : t("{n} Sends", { n: total })} />
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sortedBoulderGrades(summary).map(([grade, count]) => (
          <span key={grade} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
            {t("Grad {grade}", { grade })} <b className="font-bold tabular-nums text-primary">×{count}</b>
          </span>
        ))}
        {summary.routes > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
            {t("Routen")} <b className="font-bold tabular-nums text-primary">×{summary.routes}</b>
          </span>
        )}
      </div>
    </div>
  );
}
