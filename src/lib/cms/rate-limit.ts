// Simple in-memory rate limiting for the CMS endpoints.
//
// Limitation, stated plainly: this state lives in a single serverless instance and
// resets on a cold start, so it is a speed bump rather than a hard guarantee. It
// still raises the cost of password guessing and publish spamming, which is the
// practical goal. A distributed limiter would need a shared store; Supabase could
// provide one at no cost, but this is deliberately kept simple for now.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Records an attempt for `key` and reports whether it is within `limit` per
 * `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
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

/** Derives a client identifier from proxy headers, falling back to a constant. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
