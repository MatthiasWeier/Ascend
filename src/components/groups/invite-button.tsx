"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/clipboard";
import { useT } from "@/components/locale-provider";

export function InviteButton({ inviteCode }: { inviteCode: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success(t("Invite link copied!"));
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    // Neither copy method worked (e.g. browser quirk) - fall back to
    // showing the link so it can be selected and copied by hand.
    setFallbackUrl(url);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        {t("Invite")}
      </Button>

      <Dialog open={!!fallbackUrl} onOpenChange={(open) => !open && setFallbackUrl(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Invite link")}</DialogTitle>
            <DialogDescription>
              {t("Automatic copying didn't work - select the link and copy it manually.")}
            </DialogDescription>
          </DialogHeader>
          <Input readOnly value={fallbackUrl ?? ""} onFocus={(e) => e.currentTarget.select()} autoFocus />
        </DialogContent>
      </Dialog>
    </>
  );
}
