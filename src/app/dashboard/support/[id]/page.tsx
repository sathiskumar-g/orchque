import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase-server";
import { getServerUser, isSupabaseConfigured } from "@/lib/server-user";
import TicketDetail from "@/components/support/TicketDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Ticket" };

export default async function TicketPage({ params }: Props) {
  const { id } = await params;
  const user = await getServerUser();

  if (!user) notFound();
  if (!isSupabaseConfigured()) notFound();

  const supabase = createServerClient();

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, subject, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from("support_messages")
    .select("id, body, is_staff, attachments, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to support
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
            {ticket.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Ticket #{id.slice(0, 8)}</p>
      </div>

      <TicketDetail
        ticket={ticket}
        messages={messages ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
