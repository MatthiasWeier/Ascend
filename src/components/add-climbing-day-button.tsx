"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoulderDayDialog } from "@/components/analytics/boulder-day-dialog";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

// Today as a Europe/Berlin calendar day (YYYY-MM-DD), same day boundary the
// server uses.
function todayBerlin() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Home-page shortcut: log today's climbing day without going to Analytics.
export function AddClimbingDayButton({ className, size }: { className?: string; size?: "default" | "lg" }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => todayBerlin());

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={cn(className)}
        onClick={() => {
          setDate(todayBerlin());
          setOpen(true);
        }}
      >
        <Mountain className="size-4" />
        {t("Climbing day")}
      </Button>
      {open && <BoulderDayDialog date={date} open={open} onOpenChange={setOpen} onSaved={() => router.refresh()} />}
    </>
  );
}
