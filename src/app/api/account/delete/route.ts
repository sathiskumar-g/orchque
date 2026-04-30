import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

// DELETE /api/account/delete — permanently delete user account and all data
export async function DELETE() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();

    // Delete all user data (skills cascade to versions via FK, credits and tickets cascade too)
    // Supabase auth.admin.deleteUser removes the auth record, which also cascades via ON DELETE CASCADE
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("[api/account/delete] deleteUser error:", deleteError.message);
      return NextResponse.json({ error: "Failed to delete account. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/account/delete] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
