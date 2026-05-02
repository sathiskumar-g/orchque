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
 *
 * Priority order (most to least trustworthy):
 *  1. cf-connecting-ip  — set by Cloudflare, cannot be spoofed behind CF
 *  2. x-forwarded-for LAST value — the rightmost IP is appended by the last
 *     trusted proxy (Vercel edge), not the client. The leftmost value is
 *     client-controlled and must NOT be trusted.
 *  3. x-real-ip
 */
export function getClientIP(request: Request): string {
  const headers = new Headers(request.headers);

  // Cloudflare sets this and it cannot be spoofed
  const cfIP = headers.get("cf-connecting-ip")?.trim();
  if (cfIP) return cfIP;

  // Take the LAST (rightmost) value — added by the last trusted proxy
  // The first value is user-controlled and trivially spoofable
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    const last = ips[ips.length - 1];
    if (last) return last;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Shared identifier for anonymous action limits.
 * Combines IP + a hash of User-Agent to make cycling IPs harder and to
 * give separate buckets to different tools calling from the same NAT.
 *
 * NOTE: This is an in-memory store — effective on single-instance deploys.
 * For multi-region Vercel/serverless, replace with an Upstash Redis-backed
 * limiter (@upstash/ratelimit) so limits persist across cold starts.
 */
export function getAnonymousRateLimitKey(request: Request): string {
  const ip = getClientIP(request);
  const headers = new Headers(request.headers);
  // Include a short UA fingerprint so different clients behind the same NAT
  // get separate buckets AND to make it harder to rotate just the IP.
  const ua = headers.get("user-agent")?.trim() || "no-ua";
  const uaSlug = ua.slice(0, 64).replace(/\s+/g, "_");

  if (ip !== "unknown") {
    return `anon:${ip}:${uaSlug}`;
  }
  return `anon:${uaSlug}`;
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
