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
      <h1 className="text-xl font-bold">{t("Etwas ist schiefgelaufen")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("Das ist bei uns aufgeschlagen, nicht bei dir. Versuch's nochmal, oder geh zurück zum Dashboard.")}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t("Nochmal versuchen")}</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          {t("Zum Dashboard")}
        </Button>
      </div>
    </main>
  );
}
