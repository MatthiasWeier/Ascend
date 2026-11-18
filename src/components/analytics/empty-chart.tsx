"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

// Greyed-out placeholder graph behind a short message + call to action, so
// an empty analytics tab shows what it will look like instead of a blank box.
export function EmptyChart({
  message,
  variant = "line",
  className,
}: {
  message: string;
  variant?: "line" | "bars";
  className?: string;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "relative flex h-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border",
        className
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 300 120"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full text-muted-foreground/25"
      >
        {variant === "line" ? (
          <>
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              points="10,100 50,88 90,92 130,70 170,62 210,48 250,40 290,22"
            />
            {[10, 50, 90, 130, 170, 210, 250, 290].map((x, i) => (
              <circle key={x} cx={x} cy={[100, 88, 92, 70, 62, 48, 40, 22][i]} r="4" fill="currentColor" />
            ))}
          </>
        ) : (
          [30, 55, 40, 75, 60, 90, 70, 100].map((h, i) => (
            <rect key={i} x={12 + i * 36} y={115 - h} width="24" height={h} rx="4" fill="currentColor" />
          ))
        )}
      </svg>
      <div className="relative flex flex-col items-center gap-3 px-4 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
        <Button size="sm" render={<Link href="/dashboard/workouts/new" />}>
          <PlusCircle className="size-4" />
          {t("Log your first workout")}
        </Button>
      </div>
    </div>
  );
}
