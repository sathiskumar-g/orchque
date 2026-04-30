import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "5"), 20);

    const admin = createAdminClient();

    // Verify ownership
    const { data: skill, error: skillError } = await admin
      .from("skills")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Fetch versions with offset and limit
    const { data: versions, error: versionsError } = await admin
      .from("skill_versions")
      .select(
        "id, skill_id, version, content, score, token_estimate, token_reduction_pct, security_flags, improvements, axes, is_active, created_at"
      )
      .eq("skill_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (versionsError) {
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    // Get total count to determine if there are more versions
    const { count, error: countError } = await admin
      .from("skill_versions")
      .select("id", { count: "exact", head: true })
      .eq("skill_id", id);

    if (countError) {
      return NextResponse.json(
        { error: "Failed to fetch version count" },
        { status: 500 }
      );
    }

    const hasMore = (count ?? 0) > offset + limit;

    return NextResponse.json({
      versions: versions ?? [],
      hasMore,
      total: count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/skills/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
