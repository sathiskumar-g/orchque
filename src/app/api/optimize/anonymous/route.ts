import { NextResponse } from "next/server";

/**
 * This route is no longer used.
 * The anonymous optimizer flow was split into two calls:
 *   POST /api/optimize/score/anonymous  — Phase 1: analyze + score
 *   POST /api/optimize/rewrite/anonymous — Phase 2: rewrite with selected fixes
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use /api/optimize/score/anonymous then /api/optimize/rewrite/anonymous.",
      code: "deprecated",
    },
    { status: 410 }
  );
}

