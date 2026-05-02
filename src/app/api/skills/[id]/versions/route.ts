import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import { validateRequestOrigin, logServerError } from "@/lib/security-guards";
import { checkVersionLimit } from "@/lib/credits-service";
import type { SkillVersion } from "@/types/skill";

// ─── POST — accept & save an optimized version ───────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) return NextResponse.json({ error: originError }, { status: 403 });

    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing skill id." }, { status: 400 });

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { content, score, token_estimate, token_reduction_pct, security_flags, improvements, axes } =
      (body ?? {}) as Record<string, unknown>;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Missing content." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: skill, error: skillError } = await admin
      .from("skills").select("id, user_id").eq("id", id).eq("user_id", user.id).single();
    if (skillError || !skill) return NextResponse.json({ error: "Skill not found." }, { status: 404 });

    // Check free plan version limit
    const versionLimitError = await checkVersionLimit(user.id, id);
    if (versionLimitError) {
      return NextResponse.json({ error: versionLimitError, code: "version_limit_reached" }, { status: 403 });
    }

    const { data: allVersions } = await admin
      .from("skill_versions").select("version").eq("skill_id", id).order("created_at", { ascending: false });
    const nextVersion = `v1.${allVersions?.length ?? 1}`;

    await admin.from("skill_versions").update({ is_active: false }).eq("skill_id", id);

    const { data: newVersion, error: insertError } = await admin
      .from("skill_versions")
      .insert({
        skill_id: id,
        version: nextVersion,
        content: content.trim(),
        score: typeof score === "number" ? score : null,
        token_estimate: typeof token_estimate === "number" ? token_estimate : null,
        token_reduction_pct: typeof token_reduction_pct === "number" ? token_reduction_pct : null,
        security_flags: Array.isArray(security_flags) ? security_flags : [],
        improvements: Array.isArray(improvements) ? improvements : [],
        axes: axes ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !newVersion) {
      logServerError("api/skills/[id]/versions POST", insertError?.message);
      return NextResponse.json({ error: "Failed to save version." }, { status: 500 });
    }

    return NextResponse.json({ version: newVersion as SkillVersion });
  } catch (err: unknown) {
    logServerError("api/skills/[id]/versions POST", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}



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
