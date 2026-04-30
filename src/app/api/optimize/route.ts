import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { deductCredits, ensureCreditRow, refundCredits } from "@/lib/credits-service";
import { optimizeSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { OptimizerResult } from "@/types/skill";

// 10 requests per user per minute
const OPTIMIZE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

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
    const rl = checkRateLimit(`optimize:${user.id}:${ip}`, OPTIMIZE_LIMIT);
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
      return NextResponse.json(
        {
          error: getSensitiveDataErrorMessage(sensitiveFindings),
          code: "sensitive_data_detected",
          sensitive_types: [...new Set(sensitiveFindings.map((f) => f.type))],
        },
        { status: 400 }
      );
    }

    // Ensure credit row exists then deduct
    await ensureCreditRow(user.id);
    const deduct = await deductCredits(user.id);

    if (!deduct.ok) {
      if (deduct.error === "insufficient_credits") {
        return NextResponse.json(
          { error: "You have no optimizations left this month. Upgrade to Pro for unlimited access.", code: "insufficient_credits" },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Could not process credits. Please try again." }, { status: 500 });
    }

    let result: OptimizerResult;
    try {
      result = await optimizeSkill(content.trim(), context);
    } catch (err) {
      // Refund on Claude failure
      await refundCredits(user.id).catch(() => {});
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Optimizer returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json(result);
  } catch (err) {
    logServerError("api/optimize", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
