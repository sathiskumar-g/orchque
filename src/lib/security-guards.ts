const SENSITIVE_PATTERNS: Array<{ type: string; regex: RegExp; replacement: string }> = [
  { type: "openai_key", regex: /\bsk-[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED_OPENAI_KEY]" },
  { type: "anthropic_key", regex: /\bsk-ant-[A-Za-z0-9\-]{20,}\b/g, replacement: "[REDACTED_ANTHROPIC_KEY]" },
  { type: "github_token", regex: /\bghp_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED_GITHUB_TOKEN]" },
  { type: "slack_token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, replacement: "[REDACTED_SLACK_TOKEN]" },
  { type: "bearer_token", regex: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, replacement: "Bearer [REDACTED_TOKEN]" },
  { type: "jwt", regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replacement: "[REDACTED_JWT]" },
  { type: "pem_private_key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: "[REDACTED_PRIVATE_KEY]" },
  { type: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: "[REDACTED_EMAIL]" },
  { type: "phone", regex: /\b(?:\+?\d[\d().\-\s]{7,}\d)\b/g, replacement: "[REDACTED_PHONE]" },
];

const SENSITIVE_URL_PATTERN = /\bhttps?:\/\/(?:[A-Za-z0-9-]+\.)*(?:internal|local|corp|localhost)(?:[:/][^\s]*)?/gi;

const OUTPUT_BLOCKLIST: Array<{ tag: string; regex: RegExp }> = [
  { tag: "external_data_exfiltration", regex: /\b(send|upload|post|exfiltrat(e|ion)|transmit)\b[^\n]{0,120}\b(to|into)\b[^\n]{0,120}\b(http|https|webhook|s3|slack|discord|telegram)\b/i },
  { tag: "unsafe_shell_chain", regex: /\b(curl|wget)\b[^\n]{0,120}\|\s*(bash|sh|zsh|powershell|pwsh)\b/i },
  { tag: "dangerous_eval", regex: /\b(eval|exec|child_process\.|os\.system|subprocess\.)\b/i },
  { tag: "unbounded_external_call", regex: /\b(call|fetch|request)\b[^\n]{0,100}\b(external|third-party|public api)\b/i },
];

export type SensitiveFinding = {
  type: string;
  sample: string;
};

export type OutputSanitizationResult = {
  content: string;
  blockedTags: string[];
  blockedCount: number;
};

function compactSample(sample: string): string {
  const normalized = sample.replace(/\s+/g, " ").trim();
  return normalized.length <= 80 ? normalized : `${normalized.slice(0, 77)}...`;
}

export function detectSensitiveData(input: string, maxFindings = 6): SensitiveFinding[] {
  if (!input) return [];

  const findings: SensitiveFinding[] = [];
  const seen = new Set<string>();

  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.regex.exec(input);
    while (match) {
      const key = `${pattern.type}:${match[0]}`;
      if (!seen.has(key)) {
        findings.push({ type: pattern.type, sample: compactSample(match[0]) });
        seen.add(key);
      }
      if (findings.length >= maxFindings) {
        return findings;
      }
      match = pattern.regex.exec(input);
    }
  }

  SENSITIVE_URL_PATTERN.lastIndex = 0;
  let urlMatch: RegExpExecArray | null = SENSITIVE_URL_PATTERN.exec(input);
  while (urlMatch) {
    const key = `private_url:${urlMatch[0]}`;
    if (!seen.has(key)) {
      findings.push({ type: "private_url", sample: compactSample(urlMatch[0]) });
      seen.add(key);
    }
    if (findings.length >= maxFindings) {
      return findings;
    }
    urlMatch = SENSITIVE_URL_PATTERN.exec(input);
  }

  return findings;
}

export function redactSensitiveData(input: string): string {
  if (!input) return input;

  let redacted = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern.regex, pattern.replacement);
  }
  redacted = redacted.replace(SENSITIVE_URL_PATTERN, "[REDACTED_PRIVATE_URL]");
  return redacted;
}

export function summarizeSensitiveTypes(findings: SensitiveFinding[]): string[] {
  return [...new Set(findings.map((f) => f.type))];
}

export function getSensitiveDataErrorMessage(findings: SensitiveFinding[]): string {
  const categories = summarizeSensitiveTypes(findings);
  const listed = categories.slice(0, 4).join(", ");
  const suffix = categories.length > 4 ? ", ..." : "";
  return `Sensitive data detected (${listed}${suffix}). Remove secrets or private data before submitting.`;
}

export function sanitizeModelOutputContent(content: string): OutputSanitizationResult {
  if (!content.trim()) {
    return { content, blockedTags: [], blockedCount: 0 };
  }

  const blockedTags = new Set<string>();
  const keptLines: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    const blocked = OUTPUT_BLOCKLIST.find((rule) => rule.regex.test(line));
    if (blocked) {
      blockedTags.add(blocked.tag);
      continue;
    }
    keptLines.push(line);
  }

  return {
    content: keptLines.join("\n").trim(),
    blockedTags: [...blockedTags],
    blockedCount: blockedTags.size,
  };
}

function isDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function getConfiguredOrigins(): string[] {
  const origins = new Set<string>();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore invalid env value.
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    origins.add(`https://${vercelUrl.replace(/^https?:\/\//, "")}`);
  }

  return [...origins];
}

export function validateRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");

  // Non-browser callers may not send Origin.
  if (!origin) return null;

  const allowedOrigins = getConfiguredOrigins();
  if (allowedOrigins.length === 0) {
    return process.env.NODE_ENV === "production"
      ? "Origin validation is not configured."
      : null;
  }

  if (allowedOrigins.includes(origin)) return null;
  if (process.env.NODE_ENV !== "production" && isDevOrigin(origin)) return null;

  return "Cross-origin requests are not allowed.";
}

export function logServerError(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : "unknown_error";
  console.error(`[${scope}] ${message}`);
}
