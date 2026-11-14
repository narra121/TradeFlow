import { cn } from "@/lib/utils";

/** A labelled skeleton is announced as a status; aria-label on a plain div is prohibited (axe aria-prohibited-attr). */
function Skeleton({ className, role, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role={role ?? (props["aria-label"] ? "status" : undefined)} className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
