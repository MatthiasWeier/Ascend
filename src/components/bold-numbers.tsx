import { cn } from "@/lib/utils";

// Renders a summary string with its numbers ("2 Übungen · 4 Sätze",
// "100/100") picked out in bold accent colour, so the metrics stand out from
// the surrounding status text. Works on the already translated string, so it
// is language-independent.
export function BoldNumbers({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\d+(?:\/\d+)?)/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className={cn("font-bold tabular-nums text-primary", className)}>
            {part}
          </b>
        ) : (
          part
        )
      )}
    </>
  );
}
