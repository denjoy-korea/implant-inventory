/**
 * In-memory IP-based rate limiter for Edge Functions.
 *
 * Deno Deploy isolates are ephemeral — the Map resets on cold start.
 * This provides per-isolate protection against burst abuse.
 * Not a substitute for infrastructure-level rate limiting, but a practical first layer.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

/**
 * Check if request should be rate-limited.
 *
 * @param req - Request object (uses x-forwarded-for or cf-connecting-ip)
 * @param maxRequests - Max requests per window (default: 10)
 * @param windowMs - Window duration in ms (default: 60_000 = 1 minute)
 * @returns null if allowed, or a Response (429) if rate-limited
 */
export function checkRateLimit(
  req: Request,
  corsHeaders: Record<string, string>,
  maxRequests = 10,
  windowMs = 60_000,
): Response | null {
  cleanup();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const now = Date.now();
  const key = ip;
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: "too_many_requests", retry_after_seconds: retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  return null;
}
