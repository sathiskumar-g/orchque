import { NextResponse } from "next/server";
import { rewriteSkill, ClaudeParseError } from "@/lib/claude";
import { validateSkillContent } from "@/lib/skill-optimizer-prompt";
import {
  detectSensitiveData,
  getSensitiveDataErrorMessage,
  logServerError,
  validateRequestOrigin,
} from "@/lib/security-guards";

// Rewrite endpoint: no credit deduction for anonymous (credit already consumed at score step).
// No rate limit check needed here — the score endpoint already gated this session.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const originError = validateRequestOrigin(request);
    if (originError) {
      return NextResponse.json({ error: originError }, { status: 403 });
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

    const { content, selectedFixes } = body as Record<string, unknown>;

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

    if (!Array.isArray(selectedFixes) || selectedFixes.length === 0) {
      return NextResponse.json({ error: "selectedFixes must be a non-empty array of strings." }, { status: 400 });
    }

    const fixes = (selectedFixes as unknown[])
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .slice(0, 10)
      .map((f) => f.slice(0, 200));

    if (fixes.length === 0) {
      return NextResponse.json({ error: "No valid fixes provided." }, { status: 400 });
    }

    let optimizedContent: string;
    try {
      optimizedContent = await rewriteSkill(content.trim(), fixes);
    } catch (err) {
      if (err instanceof ClaudeParseError) {
        return NextResponse.json(
          { error: "Rewriter returned an unexpected response. Please try again." },
          { status: 422 }
        );
      }
      throw err;
    }

    return NextResponse.json({ optimized_content: optimizedContent });
  } catch (err: unknown) {
    logServerError("api/optimize/rewrite/anonymous", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
