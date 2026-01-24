import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-emerald-400 text-black hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-[1.02]",
        outline:
          "border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-400/50 hover:text-emerald-400",
        secondary:
          "bg-white/5 text-white/90 hover:bg-white/10 backdrop-blur-sm",
        ghost: "hover:bg-emerald-400/10 hover:text-emerald-400",
        link: "text-emerald-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2 rounded-xl",
        sm: "h-9 px-4 rounded-lg",
        lg: "h-12 px-8 rounded-xl md:h-14 md:px-10",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

