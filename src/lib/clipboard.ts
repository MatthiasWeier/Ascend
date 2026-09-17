// navigator.clipboard only exists in "secure contexts" (HTTPS, or
// http://localhost specifically) - plain HTTP over a LAN IP (the common
// case for a self-hosted instance without a reverse proxy/TLS yet) doesn't
// qualify, so the modern API is silently unavailable or throws there. This
// falls back to the old textarea + execCommand("copy") trick, which has no
// such restriction, so invite links etc. still work before you've set up
// HTTPS.
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path below
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}
