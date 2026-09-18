// Fixed-window rate limiter, in-memory. Fine for a single-instance
// deployment (our Docker Compose setup runs exactly one `app` container).
// If this ever runs multi-instance, swap the Map for a shared store
// (Redis/Upstash) - the call sites won't need to change.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded from one-off keys
// (e.g. an IP that only ever makes one request).
if (typeof setInterval !== "undefined") {
  const interval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    },
    5 * 60 * 1000
  );
  interval.unref?.();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, retryAfterSec: 0 };
}

// Best-effort client IP from standard proxy headers, falling back to a
// constant - good enough for a single-tenant LAN/small deployment; behind a
// real reverse proxy, make sure it forwards X-Forwarded-For.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Reads a positive-integer env var, falling back to `fallback` if unset,
// empty, or not a valid positive number - lets self-hosters tune the
// login/registration limits without a code change, see .env.example.
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
