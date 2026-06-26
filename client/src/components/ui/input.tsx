import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-white dark:bg-slate-900/60",
        "px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground/70",
        "ring-offset-background transition-all duration-150",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        "hover:border-slate-400 dark:hover:border-slate-500",
        error   && "border-red-500 focus-visible:ring-red-500 bg-red-50/30 dark:bg-red-900/10",
        success && "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
