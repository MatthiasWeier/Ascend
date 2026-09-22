// Runs once when the server starts (Next.js instrumentation hook) - the
// one place we start the in-process reminder scheduler (lib/scheduler.ts).
// Only on the Node.js runtime; the edge runtime never runs this app's
// server code, but the check is what Next's own docs recommend.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
  }
}
