import { createServerClient } from "@/lib/supabase-server";
import { getBalance } from "@/lib/credits-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await getBalance(user.id);
    if (!balance) {
      return NextResponse.json({ error: "Credits not found" }, { status: 404 });
    }

    return NextResponse.json(balance);
  } catch (err: unknown) {
    console.error("[api/credits/balance] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
