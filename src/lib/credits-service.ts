/**
 * Server-side helpers for checking, deducting, and refunding credits.
 * All writes use the Supabase admin client (service role) so they can
 * bypass RLS and work inside API routes.
 *
 * The heavy lifting (atomicity) lives in SQL functions:
 *   check_and_deduct_credits()
 *   refund_credits()
 */

import { createAdminClient } from "@/lib/supabase-admin";
import { CREDITS } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditBalance {
  plan: "free" | "pro";
  monthly: number;
  bonus: number;
  total: number;
}

export interface DeductResult {
  ok: boolean;
  balanceAfter: number;
  error?: "insufficient_credits" | "credits_row_missing" | "unknown";
  rawError?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the current credit balance for a user.
 * Returns null if no row exists.
 */
export async function getBalance(userId: string): Promise<CreditBalance | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_credits")
    .select("plan, monthly_credits, bonus_credits")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    plan: data.plan as CreditBalance["plan"],
    monthly: data.monthly_credits as number,
    bonus: data.bonus_credits as number,
    total: (data.monthly_credits as number) + (data.bonus_credits as number),
  };
}

/**
 * Ensure a user has a user_credits row.
 * Called during action routes if the row might be missing.
 * Safe to call multiple times — uses ON CONFLICT DO NOTHING.
 */
export async function ensureCreditRow(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_credits").upsert(
    {
      user_id: userId,
      plan: "free",
      monthly_credits: CREDITS.FREE_MONTHLY,
      bonus_credits: 0,
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
}

/**
 * Atomically check balance and deduct credits.
 * Uses the check_and_deduct_credits() SQL function for atomic read-modify-write.
 */
export async function deductCredits(
  userId: string,
  cost: number = CREDITS.COST_PER_ACTION
): Promise<DeductResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_and_deduct_credits", {
    p_user_id: userId,
    p_cost: cost,
  });

  if (error) {
    console.error("[credits-service] deductCredits RPC error:", error.message);
    return {
      ok: false,
      balanceAfter: 0,
      error: "unknown",
      rawError: error.message,
    };
  }

  const result = data as {
    ok: boolean;
    balance_after?: number;
    error?: string;
    balance?: number;
  };

  if (!result.ok) {
    return {
      ok: false,
      balanceAfter: result.balance ?? 0,
      error: (result.error as DeductResult["error"]) ?? "unknown",
    };
  }

  return {
    ok: true,
    balanceAfter: result.balance_after ?? 0,
  };
}

/**
 * Refund credits to a user (e.g. on action failure).
 */
export async function refundCredits(
  userId: string,
  amount: number = CREDITS.COST_PER_ACTION
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
  });
}
