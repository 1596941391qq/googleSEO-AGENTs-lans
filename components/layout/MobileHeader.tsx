import React from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface MobileHeaderProps {
  isDarkTheme: boolean;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  title?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  isDarkTheme,
  isMenuOpen,
  onMenuToggle,
  title = "Niche Digger",
}) => {
  return (
    <header
      className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-xl transition-all duration-300",
        isDarkTheme
          ? "bg-[#0a0a0a]/90 border-white/10"
          : "bg-white/90 border-gray-200"
      )}
    >
      <div className="flex items-center justify-between px-4 h-16">
        {/* 汉堡菜单按钮 */}
        <button
          onClick={onMenuToggle}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-300 ease-out min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95",
            isDarkTheme
              ? "text-white/70 hover:text-white hover:bg-white/10"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo 和标题 */}
        <div className="flex items-center space-x-2 absolute left-1/2 -translate-x-1/2">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-7 h-7 object-contain"
          />
          <h1
            className={cn(
              "text-sm font-bold tracking-wide",
              isDarkTheme ? "text-white/90" : "text-gray-900"
            )}
          >
            {title}
          </h1>
        </div>

        {/* 占位符保持布局平衡 */}
        <div className="w-11"></div>
      </div>
    </header>
  );
};
