/**
 * Dev-only bypass credentials.
 * Active when DEV_BYPASS_AUTH=true in .env.local AND NODE_ENV !== "production".
 * Never active in production builds.
 */

export const DEV_SESSION_COOKIE = "__dev_session";
export const DEV_SESSION_VALUE = "1";
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEV_TEST_EMAIL = "testid@testskills.com";
export const DEV_TEST_PASSWORD = "testid@123";

export const DEV_USER = {
  id: DEV_USER_ID,
  email: DEV_TEST_EMAIL,
} as const;

/** Returns true only in non-production with DEV_BYPASS_AUTH=true */
export function isDevBypass(): boolean {
  return (
    process.env.DEV_BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
