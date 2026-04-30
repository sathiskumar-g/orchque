import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || "/dashboard";
  // Sanitize: must start with / and not // (prevents open redirect)
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = createServerClient();

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?error=auth_exchange_failed`
        );
      }

      if (data.session) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          return NextResponse.redirect(`${requestUrl.origin}${next}?verified=true`);
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (err) {
      console.error("Unexpected auth error:", err);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=auth_exchange_failed`
      );
    }
  }

  return NextResponse.redirect(requestUrl.origin);
}
