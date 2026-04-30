import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { zipSync, strToU8 } from "fflate";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/download — public, no auth required
// Returns a .zip containing the skill content
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

    const sharedAt = new Date().toISOString();
    const skillDate = new Date(skill.created_at).toLocaleDateString();
    const versionDate = new Date(version.created_at).toLocaleDateString();

    // skill.txt — the raw content
    const skillContent = version.content;

    // info.txt — metadata
    const infoContent = [
      `Skill: ${skill.name}`,
      `Version: ${version.version}`,
      `Score: ${version.score != null ? version.score + "/100" : "Not scored"}`,
      `Tokens: ${version.token_estimate ?? "—"}`,
      `Created: ${skillDate}`,
      `Version date: ${versionDate}`,
      `Shared: ${sharedAt}`,
    ].join("\n");

    // Sanitize skill name for filename
    const safeName = skill.name.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);

    const zip = zipSync({
      [`${safeName}.txt`]: strToU8(skillContent),
      "info.txt": strToU8(infoContent),
    });

    // Ensure we pass a true ArrayBuffer, not ArrayBufferLike/SharedArrayBuffer
    const ab = new Uint8Array(zip).buffer.slice(0);
    return new Response(new Blob([ab]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/skills/[id]/download] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
