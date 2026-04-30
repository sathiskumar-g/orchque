import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/share — public, no auth required
// Returns the active version's content + skill metadata for the share page
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const admin = createAdminClient();

    const { data: skill, error: skillErr } = await admin
      .from("skills")
      .select("id, name, created_at")
      .eq("id", id)
      .single();

    if (skillErr || !skill) {
      return NextResponse.json({ error: "Skill not found." }, { status: 404 });
    }

    // Get the active (latest) version
    const { data: version, error: verErr } = await admin
      .from("skill_versions")
      .select("version, content, score, token_estimate, created_at")
      .eq("skill_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (verErr || !version) {
      return NextResponse.json({ error: "No versions found." }, { status: 404 });
    }

    return NextResponse.json({ skill, version });
  } catch (err) {
    console.error("[api/skills/[id]/share] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
