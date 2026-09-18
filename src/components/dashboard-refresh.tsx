"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PullToRefresh } from "@/components/pull-to-refresh";

export function DashboardRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    return new Promise<void>((resolve) => {
      startTransition(() => {
        router.refresh();
        resolve();
      });
    });
  }

  return <PullToRefresh onRefresh={refresh}>{children}</PullToRefresh>;
}
