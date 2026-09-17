import Link from "next/link";

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
    </footer>
  );
}
