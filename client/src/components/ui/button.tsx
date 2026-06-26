import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground shadow-sm hover:opacity-90 hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
        outline:     "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-slate-400 dark:hover:border-slate-500",
        secondary:   "bg-secondary text-secondary-foreground shadow-sm hover:opacity-90",
        ghost:       "hover:bg-accent hover:text-accent-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
        success:     "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        soft:        "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-blue-300",
        "soft-destructive": "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-11 rounded-lg px-6 text-base",
        xl:      "h-12 rounded-lg px-8 text-base",
        icon:    "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
