import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md [@media(pointer:coarse)]:min-h-11 border border-input bg-background px-3 py-1.5 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 hover:border-muted-foreground/60 aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onWheel={onWheel ?? (type === 'number' ? (e) => (e.target as HTMLInputElement).blur() : undefined)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
