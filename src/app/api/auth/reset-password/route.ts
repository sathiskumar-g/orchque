import { createServerClient } from "@/lib/supabase-server";
import { withRetry, throwIfRetryable } from "@/lib/retry";
import { checkRateLimit, getClientIP, RESET_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`reset:${ip}`, RESET_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many reset attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const origin = getAppOrigin();
    const supabase = createServerClient();

    const { error } = await withRetry(
      async () => {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
        });
        throwIfRetryable(result.error);
        return result;
      },
      { maxRetries: 2, initialDelayMs: 1000 }
    );

    if (error) {
      console.warn("[api/auth/reset-password] Supabase error:", error.message);
    }

    // Always return success — don't reveal if email exists
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (err: unknown) {
    console.error("[api/auth/reset-password] Error:", err);
    return NextResponse.json(
      { error: "Unable to reach the authentication server. Please try again in a moment." },
      { status: 503 }
    );
  }
}
