import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit, getClientIP, SIGNOUT_LIMIT } from "@/lib/rate-limit";
import { isDevBypass, DEV_SESSION_COOKIE } from "@/lib/dev-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`signout:${ip}`, SIGNOUT_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ success: false }, { status: 429 });
  }

  const response = NextResponse.json({ success: true });

  // Dev bypass: clear the dev session cookie.
  if (isDevBypass()) {
    response.cookies.delete(DEV_SESSION_COOKIE);
    return response;
  }

  try {
    const supabase = createServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("[api/auth/signout] Supabase signOut error:", error.message);
    }
    return response;
  } catch (err: unknown) {
    console.error("[api/auth/signout] Error:", err);
    // Always return success — the intent is to sign out
    return response;
  }
}
