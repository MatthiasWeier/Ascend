"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Client-side render error", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h1 className="text-xl font-bold">Etwas ist schiefgelaufen</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Das ist bei uns aufgeschlagen, nicht bei dir. Versuch's nochmal, oder geh zurück zum Dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Nochmal versuchen</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Zum Dashboard
        </Button>
      </div>
    </main>
  );
}
