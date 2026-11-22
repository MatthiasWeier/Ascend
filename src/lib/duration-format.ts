// Read-only display formatting for a duration stored in seconds (no per-row unit
// to respect here, unlike the input form - so just pick whichever reads better).
export function formatDurationSec(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round((seconds / 60) * 100) / 100;
  return `${minutes}min`;
}
