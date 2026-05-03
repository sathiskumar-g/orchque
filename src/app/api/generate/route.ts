import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { deductCredits, ensureCreditRow, refundCredits, getUserPlan } from "@/lib/credits-service";
import { generateSkill, generateSkillPackage, ClaudeParseError } from "@/lib/claude";
import { validateGeneratorDescription } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { GeneratorResult, GeneratorPackageResult } from "@/types/skill";

// 10 requests per user per minute
const GENERATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

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
    const rl = checkRateLimit(`generate:${user.id}:${ip}`, GENERATE_LIMIT);
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

    const { description, businessContext, package: isPackage } = (body ?? {}) as Record<string, unknown>;

    if (typeof description !== "string") {
      return NextResponse.json({ error: "description is required." }, { status: 400 });
    }

    const descError = validateGeneratorDescription(description);
    if (descError) {
      return NextResponse.json({ error: descError }, { status: 400 });
    }

    const context = typeof businessContext === "string" ? businessContext.slice(0, 500) : undefined;
    const wantsPackage = isPackage === true;

    // Package mode is Pro-only
    if (wantsPackage) {
      const plan = await getUserPlan(user.id);
      if (plan !== "pro") {
        return NextResponse.json(
          { error: "Skill packages are available on Pro plan only.", code: "pro_required" },
          { status: 403 }
        );
      }
    }

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

    // Ensure credit row exists then deduct
    await ensureCreditRow(user.id);
    const deduct = await deductCredits(user.id);

    if (!deduct.ok) {
      if (deduct.error === "insufficient_credits") {
        return NextResponse.json(
          { error: "You have no generations left this month. Upgrade to Pro for more.", code: "insufficient_credits" },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Could not process credits. Please try again." }, { status: 500 });
    }

    let result: GeneratorResult | GeneratorPackageResult;
    try {
      if (wantsPackage) {
        result = await generateSkillPackage(description.trim(), context);
      } else {
        result = await generateSkill(description.trim(), context);
      }
    } catch (err) {
      await refundCredits(user.id).catch(() => {});
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Generator returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json({ ...result, isPackage: wantsPackage });
  } catch (err) {
    logServerError("api/generate", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

// 10 requests per user per minute
const GENERATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

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
    const rl = checkRateLimit(`generate:${user.id}:${ip}`, GENERATE_LIMIT);
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

    const { description, businessContext } = (body ?? {}) as Record<string, unknown>;

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

    // Ensure credit row exists then deduct
    await ensureCreditRow(user.id);
    const deduct = await deductCredits(user.id);

    if (!deduct.ok) {
      if (deduct.error === "insufficient_credits") {
        return NextResponse.json(
          { error: "You have no generations left this month. Upgrade to Pro for more.", code: "insufficient_credits" },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Could not process credits. Please try again." }, { status: 500 });
    }

    let result: GeneratorResult;
    try {
      result = await generateSkill(description.trim(), context);
    } catch (err) {
      await refundCredits(user.id).catch(() => {});
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
    logServerError("api/generate", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
