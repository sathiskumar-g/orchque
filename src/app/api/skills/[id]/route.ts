import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Skill, SkillVersion } from "@/types/skill";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/skills/[id] — skill detail + all versions ──────────────────────

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing skill id." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch skill — verify it belongs to this user
    const { data: skill, error: skillError } = await admin
      .from("skills")
      .select("id, user_id, name, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: "Skill not found." }, { status: 404 });
    }

    // Fetch all versions ordered oldest → newest
    const { data: versions, error: versionsError } = await admin
      .from("skill_versions")
      .select(
        "id, skill_id, version, content, score, token_estimate, token_reduction_pct, security_flags, improvements, axes, is_active, created_at"
      )
      .eq("skill_id", id)
      .order("created_at", { ascending: true });

    if (versionsError) {
      console.error("[api/skills/[id] GET] Versions query error:", versionsError.message);
      return NextResponse.json({ error: "Failed to fetch skill versions." }, { status: 500 });
    }

    return NextResponse.json({
      skill: skill as Skill,
      versions: (versions ?? []) as SkillVersion[],
    });
  } catch (err: unknown) {
    console.error("[api/skills/[id] GET] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
