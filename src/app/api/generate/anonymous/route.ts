import { NextResponse } from "next/server";
import { checkRateLimit, getAnonymousRateLimitKey } from "@/lib/rate-limit";
import { generateSkill, ClaudeParseError } from "@/lib/claude";
import { validateGeneratorDescription } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { GeneratorResult } from "@/types/skill";

// 3 total anonymous actions per 24 hours shared across optimize + generate.
const ANON_GENERATE_LIMIT = { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 };

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const rl = checkRateLimit(getAnonymousRateLimitKey(request), ANON_GENERATE_LIMIT);
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

    const { description, businessContext } = body as Record<string, unknown>;

    if (typeof description !== "string") {
      return NextResponse.json({ error: "description is required." }, { status: 400 });
    }

    const descError = validateGeneratorDescription(description);
    if (descError) {
      return NextResponse.json({ error: descError }, { status: 400 });
    }

    const context = typeof businessContext === "string" ? businessContext.slice(0, 500) : undefined;

    const sensitiveFindings = detectSensitiveData(`${description}\n${context ?? ""}`);
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

    let result: GeneratorResult;
    try {
      result = await generateSkill(description.trim(), context);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Generator returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json(result);
  } catch (err) {
    logServerError("api/generate/anonymous", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
