import { getServerUser } from "@/lib/server-user";
import { createAdminClient } from "@/lib/supabase-admin";
import { BrainCircuit } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import EmptyState from "@/components/dashboard/EmptyState";
import CreditChip from "@/components/dashboard/CreditChip";
import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getServerUser();
  const admin = createAdminClient();

  // ── Fetch metrics ───────────────────────────────────────────────────────────
  const [creditsRes, skillsRes] = await Promise.allSettled([
    admin
      .from("user_credits")
      .select("plan, monthly_credits, bonus_credits")
      .eq("user_id", user?.id ?? "")
      .single(),
    admin
      .from("skills")
      .select("id, skill_versions(score)")
      .eq("user_id", user?.id ?? ""),
  ]);

  const credits = creditsRes.status === "fulfilled" ? creditsRes.value.data : null;
  const skillRows = skillsRes.status === "fulfilled" ? (skillsRes.value.data ?? []) : [];

  const plan = (credits?.plan as "free" | "pro") ?? "free";
  const totalCredits = credits ? (credits.monthly_credits ?? 0) + (credits.bonus_credits ?? 0) : null;
  const maxCredits = plan === "pro" ? PRODUCT.pricing.pro.actions : PRODUCT.pricing.free.actions;
  const creditsUsed = totalCredits !== null ? maxCredits - totalCredits : null;

  const skillCount = skillRows.length;

  // Average score across all scored versions
  const allScores = skillRows
    .flatMap((s) => (s.skill_versions ?? []) as { score: number | null }[])
    .map((v) => v.score)
    .filter((s): s is number => s !== null && s > 0);
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;

  // Credit color
  const creditColor =
    totalCredits === null ? "default"
    : totalCredits === 0 ? "red"
    : totalCredits <= 2 ? "yellow"
    : "green";

  // Score color
  const scoreColor =
    avgScore === null ? "default"
    : avgScore >= 75 ? "green"
    : avgScore >= 50 ? "yellow"
    : "red";

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </p>
        </div>
        <CreditChip />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Plan"
          value={plan === "pro" ? "Pro" : "Free"}
          description={`$${plan === "pro" ? PRODUCT.pricing.pro.price : 0}/mo`}
          emoji="🦁"
          color={plan === "pro" ? "purple" : "blue"}
        />
        <StatsCard
          label="Credits left"
          value={totalCredits !== null ? totalCredits : "—"}
          description={`${creditsUsed !== null ? creditsUsed : 0} used of ${maxCredits}`}
          emoji="🐬"
          color={creditColor as "default" | "green" | "yellow" | "red"}
        />
        <StatsCard
          label="Skills"
          value={skillCount}
          description={skillCount === 1 ? "1 skill saved" : `${skillCount} skills saved`}
          emoji="🦊"
          color={skillCount > 0 ? "purple" : "default"}
        />
        <StatsCard
          label="Avg Score"
          value={avgScore !== null ? avgScore : "—"}
          description={allScores.length > 0 ? `across ${allScores.length} version${allScores.length !== 1 ? "s" : ""}` : "Optimize to see score"}
          emoji="🦅"
          color={scoreColor as "default" | "green" | "yellow" | "red"}
        />
      </div>

      <EmptyState
        icon={BrainCircuit}
        title={skillCount === 0 ? `Ready to use ${PRODUCT.name}` : `${skillCount} skill${skillCount !== 1 ? "s" : ""} in your library`}
        description={
          skillCount === 0
            ? `Add your first AI skill to score, optimize, and version it. You have ${totalCredits ?? maxCredits} credits this month.`
            : `Head to the Skills section to optimize and manage your library. You have ${totalCredits ?? 0} credits remaining.`
        }
        actionLabel={skillCount === 0 ? "Add First Skill" : "Go to Skills"}
        actionHref="/dashboard/skills"
      />
    </div>
  );
}

