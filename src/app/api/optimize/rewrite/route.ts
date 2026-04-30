import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { rewriteSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { OptimizerResult } from "@/types/skill";

// 10 requests per user per minute
const REWRITE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

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
    const rl = checkRateLimit(`rewrite:${user.id}:${ip}`, REWRITE_LIMIT);
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

    const { content, selectedFixes } = (body ?? {}) as Record<string, unknown>;

    if (typeof content !== "string" || !Array.isArray(selectedFixes)) {
      return NextResponse.json({ error: "content and selectedFixes are required." }, { status: 400 });
    }

    const contentError = validateSkillContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const sensitiveFindings = detectSensitiveData(content);
    if (sensitiveFindings.length > 0) {
      return NextResponse.json({ error: getSensitiveDataErrorMessage(sensitiveFindings) }, { status: 400 });
    }

    let result: OptimizerResult;
    try {
      result = await rewriteSkill(content, selectedFixes);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      logServerError("rewriteSkill", err);
      return NextResponse.json({ error: "Failed to rewrite skill." }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    logServerError("/api/optimize/rewrite", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
