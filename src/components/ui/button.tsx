import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Apple HIG: Base styles with 44px touch target, rounded-lg (10px), smooth transitions
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/30 aria-invalid:ring-2",
  {
    variants: {
      variant: {
        // Apple HIG: Primary blue button with subtle shadow and smooth hover
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98] active:shadow-sm",
        // Apple HIG: Destructive red button with clear warning visual
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-[0.98] focus-visible:ring-destructive/50",
        // Apple HIG: Outline button with fill background on hover
        outline:
          "border border-border bg-background shadow-xs hover:bg-secondary hover:border-border active:scale-[0.98]",
        // Apple HIG: Secondary button with gray fill
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:scale-[0.98]",
        // Apple HIG: Ghost button - minimal, only shows on hover
        ghost: "hover:bg-secondary/50 active:bg-secondary/70 active:scale-[0.98]",
        // Apple HIG: Link style - underline with primary color
        link: "text-primary underline-offset-4 hover:underline active:opacity-70",
      },
      size: {
        // Apple HIG: Default 44px touch target minimum
        default: "min-h-[2.75rem] h-auto px-5 py-2.5 has-[>svg]:px-4",
        // Apple HIG: Small but still respecting touch targets (40px)
        sm: "min-h-[2.5rem] h-auto rounded-lg gap-1.5 px-4 py-2 has-[>svg]:px-3",
        // Apple HIG: Large for prominent actions (48px)
        lg: "min-h-[3rem] h-auto rounded-lg px-6 py-3 text-base has-[>svg]:px-5",
        // Apple HIG: Icon-only button - square with 44px minimum
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
