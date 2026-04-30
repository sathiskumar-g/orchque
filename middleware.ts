import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Dev bypass constants — inlined here because middleware runs on Edge Runtime.
const DEV_SESSION_COOKIE = "__dev_session";
const DEV_SESSION_VALUE = "1";
const DEV_MOCK_USER = { id: "00000000-0000-0000-0000-000000000001", email: "testid@testskills.com" };
function isDevBypassActive(): boolean {
  return process.env.DEV_BYPASS_AUTH === "true" && process.env.NODE_ENV !== "production";
}

/**
 * Auth middleware — token refresh + route protection.
 *
 * Strategy:
 * - If NO session cookie → skip ALL network calls (zero latency for anonymous users)
 * - If session cookie EXISTS → call getSession() which decodes JWT locally.
 *   Only makes a network call when the token is expired and needs refresh.
 *   Much faster than getUser() which ALWAYS hits Supabase.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Only create Supabase client when not in dev bypass mode (requires real env vars).
  const devBypass = isDevBypassActive();
  const supabase = devBypass
    ? null
    : createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            // 3-second fetch timeout — only used for token refresh (expired JWT).
            // getSession() is instant for fresh tokens (no network call).
            fetch: (url: string | URL | Request, options?: RequestInit) => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 3000);
              return fetch(url, { ...options, signal: controller.signal }).finally(() =>
                clearTimeout(timer)
              );
            },
          },
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        }
      );

  // Check for a Supabase session cookie without any network call.
  const hasSessionCookie = request.cookies.getAll().some(
    (c) =>
      (c.name.includes("-auth-token") || c.name.includes("-code-verifier")) &&
      c.value.length > 0
  );

  let user = null;

  // Dev bypass: if cookie is present, treat as authenticated without hitting Supabase.
  if (devBypass) {
    if (request.cookies.get(DEV_SESSION_COOKIE)?.value === DEV_SESSION_VALUE) {
      user = DEV_MOCK_USER;
    }
  } else if (hasSessionCookie && supabase) {
    // getSession() decodes the JWT locally — instant, zero network calls
    // for fresh tokens. Only makes a network call if the access token is
    // expired and needs to be refreshed via the refresh token.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
    } catch {
      // Token refresh failed (network down) — treat as unauthenticated.
      user = null;
    }
  }

  // Protect /dashboard — redirect unauthenticated users to signin
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // Signed-in users on auth pages → send to dashboard
  if (
    user &&
    (request.nextUrl.pathname === "/auth/signin" ||
      request.nextUrl.pathname === "/auth/signup" ||
      request.nextUrl.pathname === "/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*",
    "/login",
    // No "/api/:path*" — API routes handle their own auth.
  ],
};
