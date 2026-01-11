import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  // Apple HIG: Rounded corners (10px), comfortable padding, elevated shadow
  "relative w-full rounded-lg border px-5 py-4 text-sm shadow-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-4 gap-y-1 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        // Apple HIG: Default with card background and subtle border
        default: "bg-card text-card-foreground border-border",
        // Apple HIG: Destructive with fill background (semi-transparent red)
        destructive:
          "text-destructive bg-destructive/10 border-destructive/30 [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  /** Apply Apple HIG blur effect (vibrancy) */
  blur?: boolean;
}

function Alert({ className, variant, blur = false, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        alertVariants({ variant }),
        // Apple HIG: Blur effect option for iOS/macOS style
        blur && "backdrop-blur-light bg-card/95",
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        // Apple HIG: Semibold font, tight letter spacing for headings
        "col-start-2 line-clamp-1 min-h-5 font-semibold tracking-[-0.015em]",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        // Apple HIG: Secondary text color, comfortable line height for readability
        "text-muted-foreground col-start-2 grid justify-items-start gap-1.5 text-sm leading-relaxed [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
