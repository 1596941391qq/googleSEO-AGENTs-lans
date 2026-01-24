import React from "react";
import { Globe, Hash, TrendingUp, Send } from "lucide-react";
import { cn } from "../../lib/utils";

interface MobileBottomNavProps {
  isDarkTheme: boolean;
  activeTab: "my-website" | "website-data" | "projects" | "publish";
  onTabChange: (tab: "my-website" | "website-data" | "projects" | "publish") => void;
  uiLanguage: "zh" | "en";
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  isDarkTheme,
  activeTab,
  onTabChange,
  uiLanguage,
}) => {
  const labels =
    uiLanguage === "zh"
      ? {
          myWebsite: "我的网站",
          websiteData: "网站数据",
          projects: "任务看板",
          publish: "发布",
        }
      : {
          myWebsite: "Website",
          websiteData: "Data",
          projects: "Projects",
          publish: "Publish",
        };

  const navItems = [
    { id: "my-website" as const, icon: Globe, label: labels.myWebsite },
    { id: "website-data" as const, icon: Hash, label: labels.websiteData },
    { id: "projects" as const, icon: TrendingUp, label: labels.projects },
    { id: "publish" as const, icon: Send, label: labels.publish },
  ];

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t backdrop-blur-xl transition-all duration-300 safe-area-inset-bottom",
        isDarkTheme
          ? "bg-[#0a0a0a]/95 border-white/10"
          : "bg-white/95 border-gray-200"
      )}
    >
      <div className="flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ease-out min-h-[56px] flex-1 active:scale-95",
                isActive
                  ? isDarkTheme
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : isDarkTheme
                  ? "text-white/50 hover:text-white/70"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "mb-1 transition-all duration-300",
                  isActive && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wide transition-all duration-300",
                  isActive && "scale-105"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
