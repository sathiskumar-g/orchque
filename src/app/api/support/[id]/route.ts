import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

// GET /api/support/[id] — get ticket + messages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: ticket, error: ticketError } = await admin
      .from("support_tickets")
      .select("id, subject, status, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { data: messages } = await admin
      .from("support_messages")
      .select("id, body, is_staff, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ ticket, messages: messages ?? [] });
  } catch (err: unknown) {
    console.error("[api/support/[id]] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/support/[id] — add reply to ticket
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;
    if (!message || message.length > 5000) {
      return NextResponse.json({ error: "Message is required and must be under 5000 characters." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify ownership
    const { data: ticket } = await admin
      .from("support_tickets")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (ticket.status === "closed") {
      return NextResponse.json({ error: "This ticket is closed." }, { status: 400 });
    }

    await admin.from("support_messages").insert({
      ticket_id: id,
      user_id: user.id,
      body: message,
      is_staff: false,
    });

    // Re-open if pending
    await admin
      .from("support_tickets")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/support/[id]] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
