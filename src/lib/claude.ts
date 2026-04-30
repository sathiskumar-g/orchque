import Anthropic from "@anthropic-ai/sdk";
import {
  SKILL_OPTIMIZER_SYSTEM_PROMPT,
  SKILL_GENERATOR_SYSTEM_PROMPT,
  SCORE_ONLY_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
  MODEL,
  MAX_INPUT_CHARS,
} from "@/lib/skill-optimizer-prompt";
import { sanitizeModelOutputContent } from "@/lib/security-guards";
import type { OptimizerResult, GeneratorResult, ScoreResult } from "@/types/skill";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class ClaudeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeParseError";
  }
}

function sanitizeOutputOrThrow(content: string): string {
  const sanitized = sanitizeModelOutputContent(content);
  if (!sanitized.content.trim()) {
    throw new ClaudeParseError("Model output failed safety validation.");
  }
  return sanitized.content;
}

function isScoreResult(val: unknown): val is ScoreResult {
  if (typeof val !== "object" || val === null) return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v.score === "number" &&
    typeof v.axes === "object" &&
    v.axes !== null &&
    typeof v.token_estimate === "number" &&
    typeof v.token_reduction_pct === "number" &&
    Array.isArray(v.security_flags) &&
    Array.isArray(v.core_improvements) &&
    Array.isArray(v.additional_improvements)
  );
}

function isOptimizerResult(val: unknown): val is OptimizerResult {
  if (typeof val !== "object" || val === null) return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v.score === "number" &&
    typeof v.axes === "object" &&
    v.axes !== null &&
    typeof v.token_estimate === "number" &&
    typeof v.token_reduction_pct === "number" &&
    Array.isArray(v.security_flags) &&
    Array.isArray(v.improvements) &&
    typeof v.optimized_content === "string"
  );
}

/**
 * Phase 1: Score-only call. Returns analysis JSON, no rewritten content.
 * Compact output — keeps token cost low.
 */
export async function scoreSkill(content: string, businessContext?: string): Promise<ScoreResult> {
  if (content.length > MAX_INPUT_CHARS) {
    throw new Error(`Content exceeds maximum input size of ${MAX_INPUT_CHARS} characters.`);
  }

  const userMessage = businessContext?.trim()
    ? `Business context: ${businessContext.trim()}\n\n---\n\n${content}`
    : content;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024, // score JSON is small — hard cap to prevent runaway output
    system: SCORE_ONLY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (raw.type !== "text") throw new ClaudeParseError("Unexpected response type from Claude.");

  let parsed: unknown;
  try {
    const text = raw.text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    throw new ClaudeParseError("Claude returned non-JSON response.");
  }

  if (!isScoreResult(parsed)) {
    throw new ClaudeParseError("Score response did not match expected schema.");
  }

  return parsed;
}

/**
 * Phase 2: Rewrite-only call. Applies only the selected improvements.
 * Returns the rewritten skill as plain text (not JSON).
 */
export async function rewriteSkill(
  content: string,
  selectedFixes: string[]
): Promise<string> {
  if (content.length > MAX_INPUT_CHARS) {
    throw new Error(`Content exceeds maximum input size of ${MAX_INPUT_CHARS} characters.`);
  }

  const fixList = selectedFixes.map((f, i) => `${i + 1}. ${f}`).join("\n");
  const userMessage = `Apply these improvements to the skill below:\n\n${fixList}\n\n---\n\nORIGINAL SKILL:\n\n${content}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: REWRITE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (raw.type !== "text") throw new ClaudeParseError("Unexpected response type from Claude.");

  return sanitizeOutputOrThrow(raw.text.trim());
}

/**
 * Legacy single-call optimizer (used by existing skill-version routes).
 * Kept for backward compatibility with /api/skills/[id]/optimize.
 */
export async function optimizeSkill(content: string, businessContext?: string): Promise<OptimizerResult> {
  if (content.length > MAX_INPUT_CHARS) {
    throw new Error(`Content exceeds maximum input size of ${MAX_INPUT_CHARS} characters.`);
  }

  const userMessage = businessContext?.trim()
    ? `Business context: ${businessContext.trim()}\n\n---\n\n${content}`
    : content;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SKILL_OPTIMIZER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (raw.type !== "text") {
    throw new ClaudeParseError("Unexpected response type from Claude.");
  }

  let parsed: unknown;
  try {
    const text = raw.text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    throw new ClaudeParseError("Claude returned non-JSON response.");
  }

  if (!isOptimizerResult(parsed)) {
    throw new ClaudeParseError("Claude response did not match expected schema.");
  }

  parsed.optimized_content = sanitizeOutputOrThrow(parsed.optimized_content);

  return parsed;
}

function isGeneratorResult(val: unknown): val is GeneratorResult {
  if (typeof val !== "object" || val === null) return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v.content === "string" &&
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.token_estimate === "number"
  );
}

/**
 * Call Claude to generate a new skill from a plain-language description.
 */
export async function generateSkill(description: string, businessContext?: string): Promise<GeneratorResult> {
  const userMessage = businessContext?.trim()
    ? `Business context: ${businessContext.trim()}\n\nSkill to generate: ${description.trim()}`
    : `Skill to generate: ${description.trim()}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SKILL_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0];
  if (raw.type !== "text") {
    throw new ClaudeParseError("Unexpected response type from Claude.");
  }

  let parsed: unknown;
  try {
    const text = raw.text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    throw new ClaudeParseError("Claude returned non-JSON response.");
  }

  if (!isGeneratorResult(parsed)) {
    throw new ClaudeParseError("Claude response did not match expected schema.");
  }

  parsed.content = sanitizeOutputOrThrow(parsed.content);

  return parsed;
}
