import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-2xl border-0 bg-field px-4 text-base text-ink placeholder:text-text-faint disabled:cursor-not-allowed disabled:opacity-[0.38]",
        className,
      )}
      {...props}
    />
  );
}
export { Input };
