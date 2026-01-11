import * as React from "react";

import { cn } from "@/lib/utils";

interface CardProps extends React.ComponentProps<"div"> {
  /** Apply Apple HIG blur effect (vibrancy) */
  blur?: boolean;
}

function Card({ className, blur = false, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Apple HIG: Increased padding, rounded corners (10px), elevated shadows
        "bg-card text-card-foreground flex flex-col gap-6 rounded-lg border py-8 shadow-md",
        // Apple HIG: Blur effect (vibrancy) for iOS/macOS style
        blur && "backdrop-blur-light bg-card/95",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Apple HIG: Increased horizontal padding for comfortable spacing
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-3 px-8 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-8",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        // Apple HIG: Tighter letter spacing for headings, semibold weight
        "font-semibold leading-tight tracking-[-0.015em]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        // Apple HIG: Secondary text color, comfortable line height for readability
        "text-muted-foreground text-sm leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        // Apple HIG: Increased horizontal padding for comfortable content spacing
        "px-8",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Apple HIG: Increased padding, comfortable spacing for footer actions
        "flex items-center gap-3 px-8 [.border-t]:pt-8",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
