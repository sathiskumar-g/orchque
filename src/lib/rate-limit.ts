/**
 * In-memory rate limiter for auth proxy routes.
 *
 * Uses a sliding-window counter per IP address. No external dependencies.
 * In production, replace with Redis-backed limiter (e.g., @upstash/ratelimit)
 * if running multiple server instances behind a load balancer.
 *
 * For a single-instance deployment (Vercel serverless, single VPS), this works.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check rate limit for a given key (typically IP address).
 *
 * @example
 * ```ts
 * const ip = getClientIP(request);
 * const result = checkRateLimit(`signin:${ip}`, SIGNIN_LIMIT);
 * if (!result.allowed) {
 *   return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  cleanupStaleEntries(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, nginx, and direct connections.
 */
export function getClientIP(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Shared identifier for anonymous action limits.
 * Falls back to user-agent when IP is unavailable to avoid collapsing everyone into one bucket.
 */
export function getAnonymousRateLimitKey(request: Request): string {
  const ip = getClientIP(request);
  if (ip !== "unknown") {
    return `anon:${ip}`;
  }

  const headers = new Headers(request.headers);
  const userAgent = headers.get("user-agent")?.trim() || "unknown-agent";
  return `anon:${userAgent}`;
}

// ── Pre-configured limits for auth routes ─────────────────────────────────

/** Sign-in: 5 attempts per minute per IP */
export const SIGNIN_LIMIT: RateLimitConfig = { maxRequests: 5, windowMs: 60 * 1000 };

/** Sign-up: 3 attempts per minute per IP */
export const SIGNUP_LIMIT: RateLimitConfig = { maxRequests: 3, windowMs: 60 * 1000 };

/** Password reset: 2 attempts per minute per IP */
export const RESET_LIMIT: RateLimitConfig = { maxRequests: 2, windowMs: 60 * 1000 };

/** Sign-out: 10 attempts per minute per IP (generous, low risk) */
export const SIGNOUT_LIMIT: RateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 };
