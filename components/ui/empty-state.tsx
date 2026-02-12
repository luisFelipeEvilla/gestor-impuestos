import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  action?: { href: string; label: string };
};

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="rounded-full bg-muted p-4" aria-hidden>
        <Icon className="size-10 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm max-w-[280px]">{message}</p>
      {action && (
        <Link
          href={action.href}
          className="text-primary text-sm font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
