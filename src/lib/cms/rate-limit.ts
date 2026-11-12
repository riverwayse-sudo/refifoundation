// Best-effort in-memory rate limiting for CMS endpoints.
//
// This is per serverless instance and resets on cold starts; it is not a
// distributed security boundary. Production still needs an edge-level control.
// Storage is bounded and expired buckets are periodically pruned.

type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();
let callsSinceSweep = 0;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

function pruneBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * Records an attempt for `key` and reports whether it is within `limit` per
 * `windowMs`. The map has a hard upper bound to prevent unbounded memory growth.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  callsSinceSweep += 1;
  if (callsSinceSweep % 64 === 0 || buckets.size >= MAX_BUCKETS) pruneBuckets(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) pruneBuckets(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears a bucket, used after a successful sign-in so success resets the count. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Derives a bounded client identifier from the proxy chain. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const addresses = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
  const ip = addresses.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";
  return `${scope.slice(0, 64)}:${ip.slice(0, 128)}`;
}
