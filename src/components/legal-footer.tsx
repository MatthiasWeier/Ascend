import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <nav className="flex justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/impressum" className="hover:text-foreground hover:underline">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-foreground hover:underline">
          Datenschutz
        </Link>
      </nav>
      <p className="mt-1 text-center text-[10px] text-muted-foreground/60">Ascend v{APP_VERSION}</p>
    </footer>
  );
}
