"use client";

import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/components/locale-provider";
import { useInstallApp } from "@/lib/install-app";

// Step-by-step for browsers that can't show a one-tap install prompt.
export function InstallHelpDialog({ open, onOpenChange, ios }: { open: boolean; onOpenChange: (o: boolean) => void; ios: boolean }) {
  const t = useT();
  const steps = ios
    ? [
        t("Tippe unten (oder oben) auf das Teilen-Symbol - das Quadrat mit dem Pfeil nach oben."),
        t("Scrolle und wähle „Zum Home-Bildschirm“."),
        t("Tippe auf „Hinzufügen“. Ascend liegt danach als App auf deinem Home-Bildschirm."),
      ]
    : [
        t("Öffne das Browser-Menü (drei Punkte ⋮ oben rechts)."),
        t("Wähle „App installieren“ bzw. „Zum Startbildschirm hinzufügen“."),
        t("Bestätige. Ascend liegt danach als App auf deinem Startbildschirm."),
      ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Ascend als App installieren")}</DialogTitle>
          <DialogDescription>
            {t("Startet wie jede andere App, im Vollbild und ohne Browser-Leiste.")}
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {ios && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Share className="size-3.5" />
            {t("Auf dem iPhone/iPad funktioniert das über den Teilen-Knopf von Safari.")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Top strip on phones opened in the browser (not as an installed app).
// Close = until the next visit, "Nicht mehr anzeigen" = for good on this
// device; Settings has the way back.
export function InstallAppBanner() {
  const t = useT();
  const app = useInstallApp();
  const [help, setHelp] = useState(false);

  const { env } = app;
  if (!env || !env.mobile || env.standalone || app.isInstalled || app.hiddenForever || app.closedThisSession) return null;

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2.5 text-sm md:hidden">
        <div className="flex items-start gap-2">
          <Download className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="flex-1 font-medium">{t("Lade Ascend als App runter - schneller, im Vollbild und mit Push.")}</p>
          <button
            type="button"
            onClick={app.closeForNow}
            aria-label={t("Schließen")}
            title={t("Schließen")}
            className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {app.canPrompt ? (
            <Button size="sm" onClick={() => app.promptInstall()}>
              {t("Installieren")}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setHelp(true)}>
              {t("So geht's")}
            </Button>
          )}
          <button type="button" onClick={app.hideForever} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t("Nicht mehr anzeigen")}
          </button>
        </div>
      </div>
      <InstallHelpDialog open={help} onOpenChange={setHelp} ios={env.ios} />
    </>
  );
}

// Settings card: install from here any time, and bring the banner back.
export function InstallAppCard() {
  const t = useT();
  const app = useInstallApp();
  const [help, setHelp] = useState(false);
  const { env } = app;
  if (!env) return null;

  if (env.standalone || app.isInstalled) {
    return <p className="text-sm text-muted-foreground">{t("Du nutzt Ascend bereits als App. ✓")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t("Ascend lässt sich wie eine App installieren: eigenes Icon, Vollbild und Push-Nachrichten.")}
      </p>
      <div className="flex flex-wrap gap-2">
        {app.canPrompt ? (
          <Button onClick={() => app.promptInstall()}>
            <Download className="size-4" />
            {t("Installieren")}
          </Button>
        ) : (
          <Button onClick={() => setHelp(true)}>
            <Download className="size-4" />
            {t("Anleitung anzeigen")}
          </Button>
        )}
        {env.mobile && (app.hiddenForever || app.closedThisSession) && (
          <Button variant="outline" onClick={app.showAgain}>
            {t("Hinweis oben wieder anzeigen")}
          </Button>
        )}
      </div>
      <InstallHelpDialog open={help} onOpenChange={setHelp} ios={env.ios} />
    </div>
  );
}
