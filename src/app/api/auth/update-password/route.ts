import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return NextResponse.json({ error: "Failed to update password. Please request a new reset link." }, { status: 400 });
    }

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err: unknown) {
    console.error("[api/auth/update-password] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
