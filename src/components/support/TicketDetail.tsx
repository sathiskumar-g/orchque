"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
}

interface TicketDetailProps {
  ticket: Ticket;
  messages: Message[];
  currentUserId: string;
}

export default function TicketDetail({ ticket, messages: initial, currentUserId }: TicketDetailProps) {
  const [messages, setMessages] = useState(initial);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setMessages((prev) => [...prev, data.message]);
      setReply("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-4 text-sm ${
              msg.is_staff
                ? "bg-muted border"
                : "bg-primary/5 border border-primary/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">
                {msg.is_staff ? "Support team" : "You"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {ticket.status !== "closed" && (
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            type="submit"
            disabled={loading || !reply.trim()}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reply"}
          </button>
        </form>
      )}

      {ticket.status === "closed" && (
        <p className="text-sm text-muted-foreground text-center py-4">This ticket is closed.</p>
      )}
    </div>
  );
}
