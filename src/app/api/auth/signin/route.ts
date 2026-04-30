import { createServerClient } from "@/lib/supabase-server";
import { withRetry, throwIfRetryable, isRetryableError } from "@/lib/retry";
import { checkRateLimit, getClientIP, SIGNIN_LIMIT } from "@/lib/rate-limit";
import {
  isDevBypass,
  DEV_TEST_EMAIL,
  DEV_TEST_PASSWORD,
  DEV_USER,
  DEV_SESSION_COOKIE,
  DEV_SESSION_VALUE,
} from "@/lib/dev-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`signin:${ip}`, SIGNIN_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many sign-in attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Dev bypass — accept test credentials without Supabase.
    if (isDevBypass()) {
      if (
        email.toLowerCase() === DEV_TEST_EMAIL.toLowerCase() &&
        password === DEV_TEST_PASSWORD
      ) {
        const response = NextResponse.json({ user: { id: DEV_USER.id, email: DEV_USER.email } });
        response.cookies.set(DEV_SESSION_COOKIE, DEV_SESSION_VALUE, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
      }
      // Wrong test credentials in dev mode — return auth error immediately (no Supabase call).
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data, error } = await withRetry(
      async () => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        throwIfRetryable(result.error);
        return result;
      },
      { maxRetries: 2, initialDelayMs: 1000 }
    );

    if (error) {
      const status = error.status || 401;
      let safeMessage = "Invalid email or password.";
      if (status === 429) safeMessage = "Too many attempts. Please wait a moment and try again.";
      else if (status >= 500) safeMessage = "Authentication service is temporarily unavailable.";
      return NextResponse.json({ error: safeMessage }, { status });
    }

    if (data.user && !data.user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: "Please verify your email address before signing in. Check your inbox for the verification link.",
          code: "email_not_verified",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
      },
    });
  } catch (err: unknown) {
    if (isRetryableError(err)) {
      return NextResponse.json(
        {
          error: "Unable to reach the authentication server after multiple retries. Please check your internet connection and try again.",
          code: "network_error",
        },
        { status: 503 }
      );
    }
    console.error("[api/auth/signin] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
