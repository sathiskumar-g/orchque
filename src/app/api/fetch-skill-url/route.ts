import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { MAX_INPUT_CHARS } from "@/lib/skill-optimizer-prompt";
import { logServerError, validateRequestOrigin } from "@/lib/security-guards";

// 20 fetches per IP per hour — protects against SSRF abuse
const URL_FETCH_LIMIT = { maxRequests: 20, windowMs: 60 * 60 * 1000 };

// ── SSRF protection ───────────────────────────────────────────────────────────

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",       // AWS EC2 / GCP metadata
  "metadata.google.internal",
  "metadata.internal",
]);

function isPrivateIPv4(hostname: string): boolean {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [, a, b] = m.map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isSafeUrl(raw: string): { ok: boolean; error?: string; url?: URL } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "Only http and https URLs are supported." };
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, error: "URL is not accessible." };
  }

  if (isPrivateIPv4(host)) {
    return { ok: false, error: "URL is not accessible." };
  }

  // Block .internal / .local / .localhost TLDs
  if (
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost")
  ) {
    return { ok: false, error: "URL is not accessible." };
  }

  return { ok: true, url };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const originError = validateRequestOrigin(request);
  if (originError) {
    return NextResponse.json({ error: originError }, { status: 403 });
  }

  // Rate limit
  const ip = getClientIP(request);
  const rl = checkRateLimit(`url-fetch:${ip}`, URL_FETCH_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { url: rawUrl } = body as Record<string, unknown>;

  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  // SSRF check
  const check = isSafeUrl(rawUrl.trim());
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  // Fetch with 10s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(check.url!.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Orchque-SkillFetcher/1.0",
        "Accept": "text/plain, text/markdown, application/json, */*",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch the file (HTTP ${res.status}). Make sure the URL is a public direct link to a raw text file.`,
        },
        { status: 400 }
      );
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const isText =
      !contentType ||
      contentType.startsWith("text/") ||
      contentType.includes("application/json") ||
      contentType.includes("application/x-yaml") ||
      contentType.includes("application/octet-stream");

    if (!isText) {
      return NextResponse.json(
        { error: "URL does not point to a text file. Only plain text, Markdown, and JSON files are supported." },
        { status: 400 }
      );
    }

    const text = await res.text();

    if (!text.trim()) {
      return NextResponse.json(
        { error: "The file at this URL appears to be empty." },
        { status: 400 }
      );
    }

    return NextResponse.json({ content: text.slice(0, MAX_INPUT_CHARS) });
  } catch (err: unknown) {
    clearTimeout(timeout);

    if ((err as { name?: string })?.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The URL took too long to respond." },
        { status: 408 }
      );
    }

    logServerError("fetch-skill-url", err);
    return NextResponse.json(
      { error: "Failed to fetch the URL. Make sure it is a public direct link to a raw text file." },
      { status: 400 }
    );
  }
}
