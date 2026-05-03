import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open:         { label: "Open",         className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress:  { label: "In progress",  className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolved:     { label: "Done",         className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  not_resolved: { label: "Not resolved", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  closed:       { label: "Closed",       className: "bg-muted text-muted-foreground" },
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
              (STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open).className
            }`}
          >
            {(STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open).label}
          </span>
        </Link>
      ))}
    </div>
  );
}
