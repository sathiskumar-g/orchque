import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed: "bg-muted text-muted-foreground",
};

export default function TicketList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No support tickets yet. Create one above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/dashboard/support/${ticket.id}`}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
          <span
            className={`ml-4 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open
            }`}
          >
            {ticket.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
