/**
 * Anonymous trial tracking via localStorage.
 *
 * Privacy rationale: localStorage is stored only on the user's device, is never
 * sent to the server, and the user can clear it at any time. This is strictly
 * better than cookies (which can be transmitted) or server-side IP tracking
 * (which requires storing PII). The server still enforces the same limit via IP
 * rate-limiting as a backstop — localStorage is the UI layer so the gate shows
 * immediately without a server round-trip.
 *
 * Key design:
 * - One shared counter for ALL anonymous actions (optimize + generate combined).
 * - Resets after 24 hours from the first action in the current window.
 * - SSR-safe: all reads/writes are guarded with typeof window checks.
 */

const STORAGE_KEY = "orchque_anon_trials";
const MAX_TRIALS = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AnonTrialState {
  count: number;
  windowStart: number; // epoch ms when current window started
}

function readState(): AnonTrialState {
  if (typeof window === "undefined") return { count: 0, windowStart: Date.now() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, windowStart: Date.now() };
    const parsed = JSON.parse(raw) as AnonTrialState;
    // Reset if window has expired
    if (Date.now() - parsed.windowStart > WINDOW_MS) {
      return { count: 0, windowStart: Date.now() };
    }
    return parsed;
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function writeState(state: AnonTrialState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded — ignore silently, server rate-limit is the backstop
  }
}

/** Returns how many anonymous trials have been used in the current window. */
export function getAnonTrialsUsed(): number {
  return readState().count;
}

/** Returns true if the user has trials remaining. */
export function hasAnonTrialsLeft(): boolean {
  return readState().count < MAX_TRIALS;
}

/** Increments the trial counter. Call after a successful anonymous action. */
export function consumeAnonTrial(): void {
  const state = readState();
  writeState({ count: state.count + 1, windowStart: state.windowStart });
}

/** Returns how many seconds until the current window resets. */
export function anonTrialResetSeconds(): number {
  const state = readState();
  const elapsed = Date.now() - state.windowStart;
  return Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 1000));
}

export const ANON_MAX_TRIALS = MAX_TRIALS;
