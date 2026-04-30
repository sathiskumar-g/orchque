import { getServerUser, isSupabaseConfigured } from "@/lib/server-user";
import { createServerClient } from "@/lib/supabase-server";
import TicketForm from "@/components/support/TicketForm";
import TicketList from "@/components/support/TicketList";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const user = await getServerUser();

  let tickets: { id: string; subject: string; status: string; created_at: string }[] = [];

  if (user && isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      tickets = data ?? [];
    } catch {
      // Supabase unavailable — show empty list
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submit a ticket and we'll get back to you.</p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">New ticket</h2>
        <TicketForm />
      </div>

      {(tickets?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Your tickets</h2>
          <TicketList tickets={tickets ?? []} />
        </div>
      )}
    </div>
  );
}
