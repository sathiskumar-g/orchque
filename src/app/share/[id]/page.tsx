import { createAdminClient } from "@/lib/supabase-admin";
import { PRODUCT } from "@/lib/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import ShareDownloadButton from "./ShareDownloadButton";

type PageParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageParams) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: skill } = await admin.from("skills").select("name").eq("id", id).single();
  return {
    title: skill ? `${skill.name} — Shared Skill` : "Shared Skill",
    description: `View and download this AI skill shared via ${PRODUCT.name}.`,
  };
}

export default async function SharePage({ params }: PageParams) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: skill, error: skillErr } = await admin
    .from("skills")
    .select("id, name, created_at")
    .eq("id", id)
    .single();

  if (skillErr || !skill) notFound();

  const { data: version } = await admin
    .from("skill_versions")
    .select("version, content, score, token_estimate, created_at")
    .eq("skill_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!version) notFound();

  const createdDate = new Date(version.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-base hover:opacity-80 transition-opacity">
            {PRODUCT.name}
          </Link>
          <Link
            href="/auth/signup"
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center hover:bg-primary/90 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10">
        {/* Skill meta */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{skill.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {version.version} · {createdDate}
                {version.score != null && (
                  <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                    Score {version.score}/100
                  </span>
                )}
              </p>
            </div>
            <ShareDownloadButton skillId={id} skillName={skill.name} />
          </div>
        </div>

        {/* Skill content */}
        <div className="rounded-xl border bg-muted/30 p-5">
          <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed text-foreground/90">
            {version.content}
          </pre>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 rounded-xl border bg-muted/20 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium">Want to optimize your own AI skills?</p>
            <p className="text-xs text-muted-foreground">Score, rewrite, and version your prompts with {PRODUCT.name}.</p>
          </div>
          <Link
            href="/auth/signup"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center hover:bg-primary/90 transition-colors shrink-0"
          >
            Try for free
          </Link>
        </div>
      </main>
    </div>
  );
}
