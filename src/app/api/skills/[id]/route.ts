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
      .select("id, user_id, name, context, created_at")
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

// ─── PATCH /api/skills/[id] — update skill context ───────────────────────────

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing skill id." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { context, name } = (body ?? {}) as Record<string, unknown>;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof name === "string") {
      const nameTrimmed = name.trim();
      if (nameTrimmed.length === 0 || nameTrimmed.length > 120) {
        return NextResponse.json({ error: "Name must be 1–120 characters." }, { status: 400 });
      }
      // Only allow letters, numbers, spaces, hyphens, underscores, apostrophes
      if (!/^[\p{L}\p{N} '\-_]+$/u.test(nameTrimmed)) {
        return NextResponse.json({ error: "Name may only contain letters, numbers, spaces and -_'." }, { status: 400 });
      }
      updates.name = nameTrimmed;
    }

    if ("context" in (body as object)) {
      updates.context = typeof context === "string" && context.trim().length > 0
        ? context.trim().slice(0, 250)
        : null;
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("skills")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[api/skills/[id] PATCH] DB error:", error);
      return NextResponse.json({ error: error.message ?? "Failed to update skill." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[api/skills/[id] PATCH] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
