import { toast } from "sonner";

const DEFAULT_DURATION_MS = 5000;

// For destructive actions that already applied optimistically to local
// state: shows an "Rückgängig" toast and only fires onCommit (the actual
// server call) once the window elapses without the user clicking undo.
export function undoableAction({
  message,
  onCommit,
  onUndo,
  undoLabel = "Rückgängig",
  duration = DEFAULT_DURATION_MS,
}: {
  message: string;
  onCommit: () => void;
  onUndo: () => void;
  undoLabel?: string;
  duration?: number;
}) {
  let undone = false;
  const timer = setTimeout(() => {
    if (!undone) onCommit();
  }, duration);

  toast(message, {
    duration,
    action: {
      label: undoLabel,
      onClick: () => {
        undone = true;
        clearTimeout(timer);
        onUndo();
      },
    },
  });
}
