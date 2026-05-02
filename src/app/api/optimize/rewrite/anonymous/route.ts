import { NextResponse } from "next/server";
import { checkRateLimit, getAnonymousRateLimitKey } from "@/lib/rate-limit";
import { rewriteSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";

// Rewrite shares the same 3-action/24h budget as score/anonymous.
// This MUST be enforced here too — callers can hit this endpoint directly
// without going through the score step, so we cannot rely on score gating.
const ANON_REWRITE_LIMIT = { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 };
// Burst limit: max 2 per minute
const ANON_BURST_LIMIT = { maxRequests: 2, windowMs: 60 * 1000 };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const limitKey = getAnonymousRateLimitKey(request);

    const burst = checkRateLimit(`burst:${limitKey}`, ANON_BURST_LIMIT);
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down.", code: "rate_limited", retryAfterSeconds: burst.retryAfterSeconds },
        { status: 429 }
      );
    }

    const rl = checkRateLimit(limitKey, ANON_REWRITE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "You've used all 3 free anonymous actions. Sign up to get 10 monthly credits.",
          code: "trial_used",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { content, selectedFixes } = body as Record<string, unknown>;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const contentError = validateSkillContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const sensitiveFindings = detectSensitiveData(content);
    if (sensitiveFindings.length > 0) {
      return NextResponse.json(
        {
          error: getSensitiveDataErrorMessage(sensitiveFindings),
          code: "sensitive_data_detected",
          sensitive_types: [...new Set(sensitiveFindings.map((f) => f.type))],
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedFixes) || selectedFixes.length === 0) {
      return NextResponse.json({ error: "selectedFixes must be a non-empty array of strings." }, { status: 400 });
    }

    const fixes = (selectedFixes as unknown[])
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .slice(0, 10)
      .map((f) => f.slice(0, 200));

    if (fixes.length === 0) {
      return NextResponse.json({ error: "No valid fixes provided." }, { status: 400 });
    }

    let result;
    try {
      result = await rewriteSkill(content.trim(), fixes);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Rewriter returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json({ optimized_content: result.optimized_content });
  } catch (err: unknown) {
    logServerError("api/optimize/rewrite/anonymous", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
