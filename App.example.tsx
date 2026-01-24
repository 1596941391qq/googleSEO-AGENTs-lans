/**
 * 移动端优化 - 快速集成示例
 *
 * 这个文件展示了如何在你的 App.tsx 中集成移动端优化组件
 */

import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { MobileHeader } from "./components/layout/MobileHeader";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";

function App() {
  // 检测是否为移动端，移动端默认收起侧边栏
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  const [activeTab, setActiveTab] = useState<
    "my-website" | "website-data" | "projects" | "publish"
  >("my-website");

  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [uiLanguage, setUiLanguage] = useState<"zh" | "en">("zh");

  // 监听窗口大小变化，自动调整侧边栏状态
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 当侧边栏在移动端打开时，锁定背景滚动
  useEffect(() => {
    if (!isSidebarCollapsed && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarCollapsed]);

  const handleTabChange = (
    tab: "my-website" | "website-data" | "projects" | "publish"
  ) => {
    setActiveTab(tab);
    // 在移动端切换标签时，关闭侧边栏
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
    // 触发你的导航逻辑
    // onContentGeneration?.(tab);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      {/* 移动端顶部导航栏 */}
      <MobileHeader
        isDarkTheme={isDarkTheme}
        isMenuOpen={!isSidebarCollapsed}
        onMenuToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title="Niche Digger"
      />

      {/* 侧边栏 */}
      <Sidebar
        tasks={[]} // 你的任务列表
        activeTaskId={null}
        maxTasks={5}
        onTaskSwitch={(id) => console.log("Switch task:", id)}
        onTaskAdd={() => console.log("Add task")}
        onTaskDelete={(id) => console.log("Delete task:", id)}
        onLanguageToggle={() =>
          setUiLanguage((prev) => (prev === "zh" ? "en" : "zh"))
        }
        onThemeToggle={() => setIsDarkTheme((prev) => !prev)}
        uiLanguage={uiLanguage}
        step="content-generation"
        isDarkTheme={isDarkTheme}
        onContentGeneration={handleTabChange}
        contentGenerationTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 主内容区域 */}
      <main
        className={`
          flex-1 overflow-auto
          pt-16 md:pt-0
          pb-20 md:pb-0
          ${isDarkTheme ? "bg-[#0a0a0a]" : "bg-white"}
        `}
      >
        {/* 内容容器 - 添加适当的 padding */}
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* 你的页面内容 */}
          <h1 className="text-2xl font-bold text-white/90 mb-6">
            {activeTab === "my-website" && "我的网站"}
            {activeTab === "website-data" && "网站数据"}
            {activeTab === "projects" && "任务看板"}
            {activeTab === "publish" && "发布"}
          </h1>

          {/* 示例卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 md:p-8"
              >
                <h3 className="text-lg font-semibold text-white/90 mb-2">
                  卡片标题 {i}
                </h3>
                <p className="text-sm text-white/60">
                  这是一个示例卡片内容，展示移动端和桌面端的响应式布局。
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 移动端底部导航栏 */}
      <MobileBottomNav
        isDarkTheme={isDarkTheme}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        uiLanguage={uiLanguage}
      />
    </div>
  );
}

export default App;
