"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Paperclip, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  body: string;
  is_staff: boolean;
  attachments?: string[];
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

const STATUS_OPTIONS = [
  { value: "open",         label: "Open",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "resolved",     label: "Done",         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "not_resolved", label: "Not resolved", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

function getStatusOption(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function fileName(url: string) {
  try {
    const parts = new URL(url).pathname.split("/");
    const last = parts[parts.length - 1] ?? url;
    // strip timestamp prefix like 1234567890_filename.pdf
    return last.replace(/^\d+_/, "");
  } catch {
    return url;
  }
}

export default function TicketDetail({ ticket, messages: initial, currentUserId: _currentUserId }: TicketDetailProps) {
  const [messages, setMessages] = useState(initial);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
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
      setStatus("open"); // reply re-opens ticket
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) { setStatusOpen(false); return; }
    setStatusLoading(true);
    setStatusOpen(false);
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update status");
      setStatus(newStatus);
      toast.success(`Ticket marked as ${getStatusOption(newStatus).label}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatusLoading(false);
    }
  };

  const current = getStatusOption(status);

  return (
    <div className="space-y-6">
      {/* Status control */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            disabled={statusLoading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-transparent hover:opacity-80 transition-opacity disabled:opacity-50 ${current.color}`}
          >
            {statusLoading ? "Updating..." : current.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
              <div className="absolute top-full mt-1 left-0 z-20 w-40 rounded-md border bg-popover shadow-md py-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                      opt.value === status ? "font-semibold" : ""
                    }`}
                  >
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${opt.color}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {status !== "open" ? "You can reopen this ticket by sending a reply." : "Replies go directly to our support team via email."}
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-4 text-sm ${
              msg.is_staff
                ? "bg-muted border"
                : "bg-primary/5 border border-primary/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">
                {msg.is_staff ? "Support team" : "You"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Attachments
                </p>
                {msg.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    {fileName(url)}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply form */}
      <form onSubmit={handleReply} className="space-y-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Add a reply or additional information..."
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
    </div>
  );
}

