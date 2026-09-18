// Sound + vibration for when the rest timer hits zero. No audio asset
// needed - two short beeps are synthesized directly via Web Audio.
//
// Browsers only allow audio to start from a user gesture. The timer
// finishing on its own, seconds after the button click that started it,
// isn't one - so the AudioContext has to be created/resumed *during* that
// click (primeRestTimerAudio) and kept around; playing a sound on an
// already-running context later is fine even without a fresh gesture.
let audioCtx: AudioContext | null = null;

export function primeRestTimerAudio() {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function beepAt(ctx: AudioContext, offsetSeconds: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = 880;
  const start = ctx.currentTime + offsetSeconds;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  oscillator.start(start);
  oscillator.stop(start + 0.35);
}

// Two beeps + a short vibration pattern. Both are best-effort: iOS Safari
// has no Vibration API at all (navigator.vibrate is simply undefined
// there), and a browser that blocked audio just silently plays nothing -
// neither case should ever throw.
export function playRestTimerAlert() {
  try {
    if (audioCtx) {
      beepAt(audioCtx, 0);
      beepAt(audioCtx, 0.4);
    }
  } catch {
    // ignore - sound is a nice-to-have, never worth breaking the timer over
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}
