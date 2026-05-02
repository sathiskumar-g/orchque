import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { deductCredits, ensureCreditRow, refundCredits } from "@/lib/credits-service";
import { optimizeSkill, ClaudeParseError } from "@/lib/claude";
import { MAX_INPUT_CHARS } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { OptimizerResult } from "@/types/skill";

// 10 optimize calls per user per minute
const OPTIMIZE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Rate limit per user
    const ip = getClientIP(request);
    const rl = checkRateLimit(`optimize:${user.id}:${ip}`, OPTIMIZE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing skill id." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify skill ownership + get active version content
    const { data: skill, error: skillError } = await admin
      .from("skills")
      .select("id, user_id, context")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: "Skill not found." }, { status: 404 });
    }

    // Get the active version content
    const { data: activeVersion, error: versionError } = await admin
      .from("skill_versions")
      .select("id, content, version")
      .eq("skill_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (versionError || !activeVersion) {
      return NextResponse.json({ error: "No active version found for this skill." }, { status: 404 });
    }

    const content = activeVersion.content as string;
    if (content.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Skill content exceeds the 5000-token limit (~${MAX_INPUT_CHARS} characters).` },
        { status: 400 }
      );
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

    // Ensure credit row exists, then deduct BEFORE calling Claude
    await ensureCreditRow(user.id);
    const deduction = await deductCredits(user.id);
    if (!deduction.ok) {
      if (deduction.error === "insufficient_credits") {
        return NextResponse.json(
          {
            error: "You've used all your free optimizations. Upgrade to Pro for unlimited access.",
            code: "insufficient_credits",
          },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Failed to process credits. Please try again." }, { status: 500 });
    }

    // Call Claude
    let result: OptimizerResult;
    const skillContext = typeof (skill as Record<string, unknown>).context === "string"
      ? (skill as Record<string, unknown>).context as string
      : undefined;
    try {
      result = await optimizeSkill(content, skillContext);
    } catch (err) {
      // Refund on Claude failure
      await refundCredits(user.id).catch(() => {});

      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Optimizer returned an unexpected response. Credits refunded. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    // Calculate next version number for preview label (not saved yet)
    const { data: allVersions } = await admin
      .from("skill_versions")
      .select("version")
      .eq("skill_id", id)
      .order("created_at", { ascending: false });

    const versionCount = allVersions?.length ?? 1;
    const nextVersion = `v1.${versionCount}`;

    // Return result WITHOUT saving — client will call /versions to accept & save
    return NextResponse.json({
      ...result,
      next_version: nextVersion,
      original_content: content,
      original_version: activeVersion.version,
      credits_remaining: deduction.balanceAfter,
    });
  } catch (err: unknown) {
    logServerError("api/skills/[id]/optimize POST", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
