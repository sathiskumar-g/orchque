import { notFound } from "next/navigation";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import { getUserPlan } from "@/lib/credits-service";
import type { Skill, SkillVersion } from "@/types/skill";
import { SkillDetailClient } from "./SkillDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) return { title: "Skill" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("skills")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { title: data?.name ? `${data.name} — Orchque` : "Skill" };
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) return null;

  const admin = createAdminClient();

  const [{ data: skill, error }, plan] = await Promise.all([
    admin
      .from("skills")
      .select("id, user_id, name, context, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    getUserPlan(user.id),
  ]);

  if (error || !skill) notFound();

  const { data: versions } = await admin
    .from("skill_versions")
    .select(
      "id, skill_id, version, content, score, token_estimate, token_reduction_pct, security_flags, improvements, axes, is_active, created_at"
    )
    .eq("skill_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <SkillDetailClient
      skill={skill as Skill}
      versions={(versions ?? []) as SkillVersion[]}
      plan={plan}
    />
  );
}
