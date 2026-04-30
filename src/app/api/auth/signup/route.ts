import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { withRetry, throwIfRetryable } from "@/lib/retry";
import { checkRateLimit, getClientIP, SIGNUP_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { sendEmail, getNewUserEmail } from "@/lib/email";
import { validateEmail } from "@/lib/validate-email";
import { PRODUCT, CREDITS } from "@/lib/config";

function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`signup:${ip}`, SIGNUP_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const emailCheck = await validateEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const origin = getAppOrigin();
    const supabase = createServerClient();

    const { data, error } = await withRetry(
      async () => {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        throwIfRetryable(result.error);
        return result;
      },
      { maxRetries: 2, initialDelayMs: 1000 }
    );

    if (error) {
      const status = error.status || 400;
      let safeMessage = "Failed to create account. Please try again.";
      if (status === 429) safeMessage = "Too many attempts. Please wait a moment and try again.";
      else if (status >= 500) safeMessage = "Authentication service is temporarily unavailable.";
      else if (error.message?.toLowerCase().includes("already registered")) {
        safeMessage = "Failed to create account. Please try again or sign in instead.";
      }
      return NextResponse.json({ error: safeMessage }, { status });
    }

    if (data.user?.id) {
      try {
        const admin = createAdminClient();

        // Seed credit row
        await admin.from("user_credits").upsert(
          { user_id: data.user.id, plan: "free", monthly_credits: CREDITS.FREE_MONTHLY, bonus_credits: 0 },
          { onConflict: "user_id", ignoreDuplicates: true }
        );

        // Welcome notification
        admin.from("notifications").insert({
          user_id: data.user.id,
          type: "system_message",
          title: `Welcome to ${PRODUCT.name}!`,
          body: "Your account is set up and ready. Get started now.",
        }).then();
      } catch {
        // Non-critical — skip if admin client unavailable
      }

      // Notify support team
      const notifyEmail = process.env.NOTIFY_EMAIL || PRODUCT.notifyEmail;
      sendEmail({
        to: notifyEmail,
        subject: `[NEW USER] ${data.user.email}`,
        html: getNewUserEmail(data.user.email!, data.user.id),
      }).catch(() => {});
    }

    return NextResponse.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (err: unknown) {
    console.error("[api/auth/signup] Error:", err);
    const isNetworkErr =
      (err as { name?: string })?.name === "AbortError" ||
      (err as { name?: string })?.name === "AuthRetryableFetchError" ||
      ((err as { message?: string })?.message || "").toLowerCase().includes("fetch failed");

    if (isNetworkErr) {
      return NextResponse.json(
        {
          error: "Your account may have been created. Please check your email for a verification link, or try signing in.",
          code: "network_timeout",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to reach the authentication server. Please try again." }, { status: 503 });
  }
}
