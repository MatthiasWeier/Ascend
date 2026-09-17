"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite-Link kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Konnte nicht kopieren.");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      Einladen
    </Button>
  );
}
