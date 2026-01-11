import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Apple HIG: 44px touch target, rounded-lg (10px), comfortable padding
        "min-h-[2.75rem] h-auto w-full min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base shadow-xs transition-all duration-200 outline-none",
        // Apple HIG: Typography and selection colors
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // Apple HIG: File input styles
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Apple HIG: Focus state with ring (iOS/macOS style)
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:shadow-sm",
        // Apple HIG: Invalid state with destructive color
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        // Apple HIG: Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary/30",
        // Apple HIG: Dark mode adjustments
        "dark:bg-input/30 dark:border-input",
        // Responsive text size
        "md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
