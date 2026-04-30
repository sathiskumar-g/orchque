import { createServerClient } from "@/lib/supabase-server";
import { deductCredits, ensureCreditRow, refundCredits } from "@/lib/credits-service";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";

const ACTION_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

export async function POST(request: Request) {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    // Rate limit
    const ip = getClientIP(request);
    const rl = checkRateLimit(`action:${ip}`, ACTION_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Auth check
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse input
    const body = await request.json();
    const { input } = body;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json({ error: "Input is required." }, { status: 400 });
    }

    const sensitiveFindings = detectSensitiveData(input);
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

    // Ensure credit row exists
    await ensureCreditRow(user.id);

    // Deduct credits
    const deduction = await deductCredits(user.id);
    if (!deduction.ok) {
      if (deduction.error === "insufficient_credits") {
        return NextResponse.json(
          { error: "You've used all your credits. Upgrade to Pro for unlimited access.", code: "insufficient_credits" },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Failed to process credits. Please try again." }, { status: 500 });
    }

    // ── TODO: Replace this with your actual product logic ──────────────────
    // Example: call an AI API, run a computation, scrape data, etc.
    // If the action fails, call refundCredits(user.id) before returning error.
    // ───────────────────────────────────────────────────────────────────────
    try {
      // Placeholder — replace with real product logic
      const result = {
        output: `Processed: ${input.trim()}`,
        creditsRemaining: deduction.balanceAfter,
      };

      return NextResponse.json({ result });
    } catch (actionErr: unknown) {
      // Refund on failure
      await refundCredits(user.id).catch(() => {});
      logServerError("api/action action failed", actionErr);
      return NextResponse.json({ error: "Action failed. Credits refunded. Please try again." }, { status: 500 });
    }
  } catch (err: unknown) {
    logServerError("api/action", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
