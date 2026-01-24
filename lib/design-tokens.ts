/**
 * 设计系统 Tokens - Apple风格精致UI
 * 集中管理所有设计变量，避免重复代码
 */

export const designTokens = {
  // 颜色系统
  colors: {
    brand: {
      primary: "emerald-400",
      primaryHover: "emerald-500",
      primaryLight: "emerald-500/10",
      primaryGlow: "0 0 20px rgba(52, 211, 153, 0.3)",
    },
    text: {
      primary: "white/90",
      secondary: "white/60",
      tertiary: "white/40",
      inverse: "gray-900",
    },
    background: {
      dark: "#0a0a0a",
      card: "white/5",
      cardHover: "white/8",
      overlay: "black/50",
    },
    border: {
      default: "white/10",
      hover: "white/20",
      focus: "emerald-400/50",
    },
  },

  // 间距系统
  spacing: {
    card: {
      sm: "p-6",
      md: "p-8",
      lg: "p-10",
    },
    section: {
      sm: "space-y-6",
      md: "space-y-8",
      lg: "space-y-10",
    },
  },

  // 圆角系统
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },

  // 阴影系统
  shadows: {
    card: "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
    cardHover: "shadow-[0_20px_50px_rgb(0,0,0,0.3)]",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]",
    inner: "ring-1 ring-white/10",
  },

  // 动画系统
  transitions: {
    fast: "transition-all duration-200 ease-out",
    normal: "transition-all duration-300 ease-out",
    slow: "transition-all duration-500 ease-out",
    spring: "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  },

  // 字体系统
  typography: {
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    tracking: {
      tight: "tracking-tight",
      normal: "tracking-normal",
      wide: "tracking-wide",
    },
  },

  // 触摸目标尺寸（移动端优化）
  touchTarget: {
    min: "min-h-[44px] min-w-[44px]",
    button: "h-11 md:h-12",
  },
} as const;

// 工具函数：组合多个token
export const combineTokens = (...tokens: string[]) => tokens.join(" ");
