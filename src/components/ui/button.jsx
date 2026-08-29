import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-transparent hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-xs",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";