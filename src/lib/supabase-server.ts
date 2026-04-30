/**
 * Supabase Server Client Configuration (Server-Side Only)
 *
 * Uses @supabase/ssr getAll/setAll cookie API.
 * Works in Server Components, API Route Handlers, and Server Actions.
 * For client-side usage, use lib/supabase.ts instead.
 *
 * IPv4 connectivity is handled globally by next.config.ts (setGlobalDispatcher).
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createServerClient() {
  // In Next.js 15, cookies() returns a Promise. We capture it here and
  // resolve it lazily inside each cookie handler (async getAll/setAll),
  // avoiding the need to make createServerClient() itself async.
  const cookieStorePromise = cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // 12s timeout — global dispatcher forces IPv4. Long enough for slow ISP
      // connections to Supabase, short enough to fail fast on real outages.
      fetch: (url, options) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        return fetch(url, { ...options, signal: controller.signal }).finally(() =>
          clearTimeout(timer)
        );
      },
    },
    cookies: {
      async getAll() {
        return (await cookieStorePromise).getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookieStorePromise;
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        } catch {
          // setAll may throw in Server Components (read-only context).
          // The middleware handles session refresh — safe to ignore here.
        }
      },
    },
  });
}
