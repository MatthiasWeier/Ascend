"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { useT } from "@/components/locale-provider";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    logger.error("Client-side render error", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h1 className="text-xl font-bold">{t("Something went wrong")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("That's on us, not you. Try again, or head back to the dashboard.")}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t("Try again")}</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          {t("To the dashboard")}
        </Button>
      </div>
    </main>
  );
}
