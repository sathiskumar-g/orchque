/**
 * Email Validation Utility — 3-layer server-side validation
 *
 * Layer 1: Strict regex  — catches malformed addresses
 * Layer 2: Disposable blocklist — rejects 3,500+ known throwaway services
 * Layer 3: MX record lookup — confirms the domain actually has mail servers
 *
 * Usage (API routes only — Node.js runtime, not edge):
 *   import { validateEmail } from "@/lib/validate-email";
 *   const result = await validateEmail(email);
 *   if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 });
 */

import { resolveMx } from "dns/promises";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const disposableDomains: string[] = require("disposable-email-domains");
const DISPOSABLE_SET = new Set(disposableDomains);

/** RFC-compliant email regex — stricter than a bare @ check */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Full 3-layer async email validation.
 * Must be called from Node.js API routes (not edge runtime).
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required." };
  }

  const cleaned = email.trim().toLowerCase();

  // Layer 1: Regex format check
  if (!EMAIL_REGEX.test(cleaned)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  const domain = cleaned.split("@")[1];

  // Layer 2: Disposable/throwaway domain blocklist
  if (DISPOSABLE_SET.has(domain)) {
    return {
      valid: false,
      error:
        "Disposable email addresses are not allowed. Please use a permanent email address.",
    };
  }

  // Layer 3: MX record lookup
  try {
    const records = await resolveMx(domain);
    if (!records || records.length === 0) {
      return {
        valid: false,
        error:
          "This email domain cannot receive emails. Please use a valid email address.",
      };
    }
  } catch {
    return {
      valid: false,
      error:
        "This email domain does not exist. Please check your email address.",
    };
  }

  return { valid: true };
}
