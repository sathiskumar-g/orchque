import { cookies } from "next/headers";
import { DEV_SESSION_COOKIE, DEV_SESSION_VALUE, DEV_USER, isDevBypass } from "@/lib/dev-auth";

export type ServerUser = { id: string; email: string };

/**
 * Unified server-side user getter.
 * - In dev bypass mode (DEV_BYPASS_AUTH=true): reads __dev_session cookie → returns mock user.
 * - Otherwise: calls Supabase getUser().
 * Returns null if not authenticated.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  if (isDevBypass()) {
    const cookieStore = await cookies();
    if (cookieStore.get(DEV_SESSION_COOKIE)?.value === DEV_SESSION_VALUE) {
      return DEV_USER;
    }
    return null;
  }

  try {
    const { createServerClient } = await import("@/lib/supabase-server");
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}

/**
 * Returns true when Supabase env vars are configured.
 * Use this to guard Supabase DB queries in dev mode.
 */
export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
