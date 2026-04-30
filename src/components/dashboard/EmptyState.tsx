import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-2 text-center">
      {Icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
