import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendEmail, getSupportTicketEmail } from "@/lib/email";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { PRODUCT } from "@/lib/config";

const TICKET_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 }; // 3 per hour

// GET /api/support — list tickets for current user
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error: fetchError } = await admin
      .from("support_tickets")
      .select("id, subject, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    return NextResponse.json({ tickets: data ?? [] });
  } catch (err: unknown) {
    console.error("[api/support] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/support — create new ticket
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`ticket:${ip}`, TICKET_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many tickets submitted. Please wait before submitting again." },
        { status: 429 }
      );
    }

    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
    }
    if (subject.length > 200) {
      return NextResponse.json({ error: "Subject must be under 200 characters." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message must be under 5000 characters." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: ticket, error: insertError } = await admin
      .from("support_tickets")
      .insert({ user_id: user.id, subject, status: "open" })
      .select("id")
      .single();

    if (insertError || !ticket) throw insertError;

    // Add first message
    await admin.from("support_messages").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      body: message,
      is_staff: false,
    });

    // Notify support team
    const supportEmail = process.env.SUPPORT_EMAIL || PRODUCT.supportEmail;
    sendEmail({
      to: supportEmail,
      subject: `[TICKET] ${subject}`,
      html: getSupportTicketEmail(user.email!, subject, message, ticket.id),
    }).catch(() => {});

    return NextResponse.json({ ticket: { id: ticket.id } }, { status: 201 });
  } catch (err: unknown) {
    console.error("[api/support] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
