/**
 * Supabase Client Configuration (Client-Side Only)
 *
 * Uses createBrowserClient from @supabase/ssr so the session is stored in
 * cookies (not localStorage). This is required for the Next.js middleware to
 * read the session server-side and protect /dashboard routes.
 *
 * IMPORTANT: Auth operations (signIn, signUp, signOut, resetPassword) are
 * proxied through /api/auth/* routes to bypass browser→Supabase connectivity
 * issues. The browser client is used ONLY for local operations (getSession)
 * and OAuth redirects. A 5-second fetch timeout is applied so it fails fast
 * instead of hanging for 60+ seconds.
 *
 * For server-side usage, use lib/supabase-server.ts instead.
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase browser client with a fast-fail fetch timeout.
 * Session is stored in cookies so middleware + server components can read it.
 * Call this inside client components — do not call at module level.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // 5-second timeout — fail fast if Supabase is unreachable from browser.
      // Auth operations go through /api/auth/* proxy anyway, so this mainly
      // affects getSession() token refresh (rare — middleware handles most refreshes).
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const existingSignal = options?.signal;
        if (existingSignal?.aborted) {
          clearTimeout(timer);
          return Promise.reject(new DOMException("Aborted", "AbortError"));
        }

        return fetch(url, { ...options, signal: controller.signal }).finally(
          () => clearTimeout(timer)
        );
      },
    },
  });
}
