import { NextResponse } from "next/server";
import { checkRateLimit, getAnonymousRateLimitKey } from "@/lib/rate-limit";
import { scoreSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { ScoreResult } from "@/types/skill";

// 3 total anonymous actions per 24 hours shared with /api/optimize/anonymous and /api/generate/anonymous
const ANON_LIMIT = { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 };
// Burst limit: max 2 requests per minute per IP to prevent rapid concurrent hammering
const ANON_BURST_LIMIT = { maxRequests: 2, windowMs: 60 * 1000 };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const limitKey = getAnonymousRateLimitKey(request);

    // Check burst limit first (per-minute)
    const burst = checkRateLimit(`burst:${limitKey}`, ANON_BURST_LIMIT);
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down.", code: "rate_limited", retryAfterSeconds: burst.retryAfterSeconds },
        { status: 429 }
      );
    }

    const rl = checkRateLimit(limitKey, ANON_LIMIT);
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

    const { content, businessContext } = body as Record<string, unknown>;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const contentError = validateSkillContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const context = typeof businessContext === "string" ? businessContext.slice(0, 500) : undefined;

    const sensitiveFindings = detectSensitiveData(`${content}\n${context ?? ""}`);
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

    let result: ScoreResult;
    try {
      result = await scoreSkill(content.trim(), context);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Analyzer returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    logServerError("api/optimize/score/anonymous", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
