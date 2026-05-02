import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import { checkSkillLimit } from "@/lib/credits-service";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";
import type { Skill, SkillVersion } from "@/types/skill";

// ─── POST /api/skills — create skill + v1.0 ───────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { name, content, context, source } = body as Record<string, unknown>;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const contentError = validateSkillContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    const sensitiveFindings = detectSensitiveData(content);
    if (sensitiveFindings.length > 0) {
      return NextResponse.json(
        {
          error: getSensitiveDataErrorMessage(sensitiveFindings),
          code: "sensitive_data_detected",
          sensitive_types: [...new Set(sensitiveFindings.map((f) => f.type))],
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check free plan skill limit
    const skillLimitError = await checkSkillLimit(user.id);
    if (skillLimitError) {
      return NextResponse.json({ error: skillLimitError, code: "skill_limit_reached" }, { status: 403 });
    }

    const contextVal = typeof context === "string" && context.trim().length > 0
      ? context.trim().slice(0, 250)
      : null;

    const sourceVal = source === 'optimized' || source === 'generated' ? source : null;

    // Insert skill
    const { data: skill, error: skillError } = await admin
      .from("skills")
      .insert({ user_id: user.id, name: name.trim(), context: contextVal, source: sourceVal })
      .select()
      .single();

    if (skillError || !skill) {
      logServerError("api/skills POST insert skill", skillError?.message);
      return NextResponse.json({ error: "Failed to create skill." }, { status: 500 });
    }

    const typedSkill = skill as Skill;

    // Insert v1.0
    const tokenEstimate = Math.ceil(content.trim().length / 4);
    const { data: version, error: versionError } = await admin
      .from("skill_versions")
      .insert({
        skill_id: typedSkill.id,
        version: "v1.0",
        content: content.trim(),
        token_estimate: tokenEstimate,
        is_active: true,
      })
      .select()
      .single();

    if (versionError || !version) {
      // Roll back skill insert
      await admin.from("skills").delete().eq("id", typedSkill.id);
      logServerError("api/skills POST insert version", versionError?.message);
      return NextResponse.json({ error: "Failed to save skill version." }, { status: 500 });
    }

    const typedVersion = version as SkillVersion;

    return NextResponse.json(
      { skill_id: typedSkill.id, version_id: typedVersion.id },
      { status: 201 }
    );
  } catch (err: unknown) {
    logServerError("api/skills POST", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── GET /api/skills — list skills with latest version ───────────────────────

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all skills for user, plus their most-recent version (by created_at desc)
    const { data, error } = await admin
      .from("skills")
      .select(
        `
        id,
        user_id,
        name,
        created_at,
        skill_versions (
          id,
          version,
          score,
          token_estimate,
          token_reduction_pct,
          is_active,
          created_at
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logServerError("api/skills GET query", error.message);
      return NextResponse.json({ error: "Failed to fetch skills." }, { status: 500 });
    }

    // Attach latest_version (highest version string by created_at)
    const skills = (data ?? []).map((row) => {
      const versions = (row.skill_versions ?? []) as SkillVersion[];
      const sorted = [...versions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const { skill_versions: _sv, ...skillFields } = row as typeof row & { skill_versions: unknown };
      void _sv;
      return {
        ...(skillFields as Skill),
        latest_version: sorted[0] ?? null,
        version_count: versions.length,
      };
    });

    return NextResponse.json(skills);
  } catch (err: unknown) {
    logServerError("api/skills GET", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
