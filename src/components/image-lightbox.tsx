"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

// Photos are always shown whole (object-contain, never cropped) - if that
// leaves the thumbnail smaller than the slot, that's intended. Click opens
// the full image; the click is stopped so it also works inside a link/row.
export function ImageLightbox({
  src,
  alt,
  className,
  thumbClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  thumbClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={t("Bild vergrößern")}
        className={cn("pointer-events-auto block w-fit max-w-full cursor-zoom-in", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated proxy route, not optimizable */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn("h-auto max-h-96 w-auto max-w-full rounded-lg border border-border object-contain", thumbClassName)}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[95vh] flex-col items-center gap-2 p-2 sm:max-w-5xl">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain" />
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t("Original in neuem Tab öffnen")}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
