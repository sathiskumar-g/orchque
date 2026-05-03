import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: credits } = await admin
      .from("user_credits")
      .select("monthly_credits, bonus_credits, plan")
      .eq("user_id", user.id)
      .single();

    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "User";

    const total = credits
      ? (credits.monthly_credits ?? 0) + (credits.bonus_credits ?? 0)
      : null;

    return NextResponse.json({
      displayName,
      email: user.email ?? "",
      credits: total,
      plan: credits?.plan ?? "free",
    });
  } catch (err: unknown) {
    console.error("[api/user/profile] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
