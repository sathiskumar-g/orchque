import { NextResponse } from "next/server";

// TODO: Wire Lemon Squeezy checkout per product.
// See template.md Part 2.6 for the full Lemon Squeezy integration guide.
export async function POST() {
  return NextResponse.json(
    { error: "Payments not yet configured for this product." },
    { status: 501 }
  );
}
