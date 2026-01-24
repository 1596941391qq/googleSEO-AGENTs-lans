import * as React from "react"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 text-sm text-white/90 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/40 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:border-emerald-400/50 focus-visible:shadow-[0_0_20px_rgba(52,211,153,0.2)] disabled:cursor-not-allowed disabled:opacity-50 hover:border-white/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

