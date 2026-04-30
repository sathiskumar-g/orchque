import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { scoreSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { ScoreResult } from "@/types/skill";

// 10 requests per user per minute
const SCORE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ip = getClientIP(request);
    const rl = checkRateLimit(`score:${user.id}:${ip}`, SCORE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { content, businessContext } = (body ?? {}) as Record<string, unknown>;

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
      return NextResponse.json({ error: getSensitiveDataErrorMessage(sensitiveFindings) }, { status: 400 });
    }

    let score: ScoreResult;
    try {
      score = await scoreSkill(content, context);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      logServerError("scoreSkill", err);
      return NextResponse.json({ error: "Failed to score skill." }, { status: 500 });
    }

    return NextResponse.json(score);
  } catch (err) {
    logServerError("/api/optimize/score", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
