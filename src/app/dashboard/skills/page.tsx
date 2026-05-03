import Link from "next/link";
import { BrainCircuit, Plus } from "lucide-react";
import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import EmptyState from "@/components/dashboard/EmptyState";
import { SkillCard } from "@/components/skills/SkillCard";
import CreditChip from "@/components/dashboard/CreditChip";
import type { Skill, SkillVersion } from "@/types/skill";

export const metadata = { title: "Skills — Orchque" };

type SkillWithLatest = Skill & {
  latest_version: Pick<SkillVersion, "version" | "score" | "token_estimate" | "is_active" | "created_at"> | null;
  version_count: number;
};

export default async function SkillsPage() {
  const user = await getServerUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("skills")
    .select(`
      id, user_id, name, created_at,
      skill_versions ( id, version, score, token_estimate, is_active, created_at )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const skills: SkillWithLatest[] = (data ?? []).map((row) => {
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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {skills.length === 0
              ? "No skills yet — add your first one"
              : `${skills.length} skill${skills.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreditChip />
          <Link
          href="/dashboard/skills/new"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Skill
        </Link>
        </div>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="No skills yet"
          description="Paste or upload an AI skill to score and optimize it."
          actionLabel="Add your first skill"
          actionHref="/dashboard/skills/new"
        />
      ) : (
        <div className="flex flex-wrap gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
