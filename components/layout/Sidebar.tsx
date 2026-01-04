import React, { useState, useEffect } from "react";
import {
  Globe,
  Hash,
  TrendingUp,
  Send,
  Plus,
  X,
  Search,
  CheckCircle,
  Loader2,
  Workflow,
  Languages,
  SunMoon,
  Bug,
  Sparkles,
  FileText,
} from "lucide-react";
import { TaskState, UILanguage, TaskType } from "../../types";
import { cn } from "../../lib/utils";

// SidebarLink Component
interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  isDarkTheme?: boolean;
  showBadge?: boolean;
  isCollapsed?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  icon,
  label,
  onClick,
  active,
  isDarkTheme = true,
  showBadge = false,
  isCollapsed = false,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider relative ${
      isCollapsed ? "justify-center space-x-0" : "space-x-3"
    } ${
      active
        ? isDarkTheme
          ? "text-white bg-white/5 border border-white/10 shadow-lg"
          : "text-gray-900 bg-emerald-50 border border-emerald-200"
        : isDarkTheme
        ? "text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent"
    }`}
    title={isCollapsed ? label : ""}
  >
    <span
      className={`shrink-0 relative flex items-center justify-center ${
        active ? "opacity-100" : "opacity-60"
      }`}
    >
      {icon}
      {showBadge && !isCollapsed && (
        <>
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500/30 rounded-full animate-ping" />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,1),0_0_20px_rgba(239,68,68,0.6)] animate-pulse" />
        </>
      )}
      {showBadge && isCollapsed && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm" />
      )}
    </span>
    {!isCollapsed && <span className="flex-1 text-left truncate">{label}</span>}
  </button>
);

interface SidebarProps {
  tasks: TaskState[];
  activeTaskId: string | null;
  maxTasks: number;
  onTaskSwitch: (taskId: string) => void;
  onTaskAdd: () => void;
  onTaskDelete: (taskId: string, e: React.MouseEvent) => void;
  onWorkflowConfig: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  uiLanguage: UILanguage;
  step: string;
  isDarkTheme: boolean;
  onContentGeneration?: (
    tab?: "my-website" | "website-data" | "article-rankings" | "publish"
  ) => void;
  contentGenerationTab?:
    | "my-website"
    | "website-data"
    | "article-rankings"
    | "publish";
  onTestAgents?: () => void;
  onDeepDive?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  activeTaskId,
  maxTasks,
  onTaskSwitch,
  onTaskAdd,
  onTaskDelete,
  onWorkflowConfig,
  onLanguageToggle,
  onThemeToggle,
  uiLanguage,
  step,
  isDarkTheme,
  onContentGeneration,
  contentGenerationTab,
  onTestAgents,
  onDeepDive,
  isCollapsed,
  onToggleCollapse,
}) => {
  const labels =
    uiLanguage === "zh"
      ? {
          myWebsite: "我的网站",
          websiteData: "网站数据",
          articleRankings: "文章排名",
          publish: "发布",
          visualArticle: "AI 图文工场",
          activeTasks: "进行中的任务",
          options: "配置选项",
          workflow: "工作流编排",
          language: "中英切换",
          theme: "日夜间主题",
          version: "V2.8.5 System Online",
        }
      : {
          myWebsite: "My Website",
          websiteData: "Website Data",
          articleRankings: "Article Rankings",
          publish: "Publish",
          visualArticle: "AI Visual Article",
          activeTasks: "Active Tasks",
          options: "Options",
          workflow: "Workflow",
          language: "Language",
          theme: "Theme",
          version: "V2.8.5 System Online",
        };

  const getTaskIcon = (task: TaskState) => {
    const isBatchRunning =
      task.batchState &&
      task.batchState.batchCurrentIndex < task.batchState.batchTotalCount;

    if (
      task.miningState?.isMining ||
      isBatchRunning ||
      task.articleGeneratorState?.isGenerating ||
      task.deepDiveState?.isDeepDiving
    ) {
      return <Loader2 size={14} className="animate-spin text-emerald-500" />;
    }

    if (task.type === "article-generator") {
      return (
        <Sparkles
          size={14}
          className={
            activeTaskId === task.id ? "text-purple-400" : "text-neutral-600"
          }
        />
      );
    }

    if (task.type === "batch") {
      return (
        <Languages
          size={14}
          className={
            activeTaskId === task.id ? "text-blue-400" : "text-neutral-600"
          }
        />
      );
    }

    if (task.miningState?.miningSuccess) {
      return <CheckCircle size={14} className="text-emerald-500" />;
    }
    return (
      <Search
        size={14}
        className={
          activeTaskId === task.id ? "text-emerald-500" : "text-neutral-600"
        }
      />
    );
  };

  return (
    <aside
      className={`relative border-r flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      } ${
        isDarkTheme ? "border-white/5 bg-[#0a0a0a]" : "border-gray-200 bg-white"
      }`}
    >
      {/* Sidebar Toggle Button - Enhanced Visibility */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute -right-3 top-32 w-7 h-7 rounded-full border z-[60] flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] group/btn",
          isDarkTheme
            ? "bg-[#111] border-white/20 text-white/70 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/10"
            : "bg-white border-gray-300 text-gray-500 hover:text-emerald-600 hover:border-emerald-600 shadow-sm"
        )}
      >
        <TrendingUp
          size={12}
          className={cn(
            "transition-transform duration-500",
            isCollapsed
              ? "rotate-90 scale-125"
              : "-rotate-90 group-hover/btn:-translate-y-0.5"
          )}
        />
        {/* Hover ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/0 group-hover/btn:scale-125 group-hover/btn:border-emerald-500/30 transition-all duration-300 pointer-events-none"></div>
      </button>

      <div
        className={cn(
          "p-6 border-b transition-all duration-300",
          isCollapsed ? "px-4" : "p-6",
          isDarkTheme ? "border-white/5" : "border-gray-200"
        )}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1
                className={cn(
                  "text-xs font-black tracking-widest leading-none",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                Niche Digger
              </h1>
              <p className="text-[9px] text-emerald-500 font-bold tracking-tight uppercase mt-1">
                Mine Hidden Alpha
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {onContentGeneration && (
          <div className="space-y-1">
            <SidebarLink
              icon={<Globe size={14} />}
              label={labels.myWebsite}
              onClick={() => onContentGeneration("my-website")}
              active={
                step === "content-generation" &&
                contentGenerationTab === "my-website"
              }
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              icon={<Hash size={14} />}
              label={labels.websiteData}
              onClick={() => onContentGeneration("website-data")}
              active={
                step === "content-generation" &&
                contentGenerationTab === "website-data"
              }
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              icon={<TrendingUp size={14} />}
              label={labels.articleRankings}
              onClick={() => onContentGeneration("article-rankings")}
              active={
                step === "content-generation" &&
                contentGenerationTab === "article-rankings"
              }
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              icon={<Send size={14} />}
              label={labels.publish}
              onClick={() => onContentGeneration("publish")}
              active={
                step === "content-generation" &&
                contentGenerationTab === "publish"
              }
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
          </div>
        )}

        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 mb-4 animate-in fade-in duration-300">
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isDarkTheme ? "text-neutral-500" : "text-gray-500"
                }`}
              >
                {labels.activeTasks}
              </span>
              {tasks.length < maxTasks && (
                <button
                  onClick={onTaskAdd}
                  className="text-emerald-500 hover:text-emerald-400 p-1 transition-colors"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          )}
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center justify-between p-3 rounded transition-all border",
                  isCollapsed ? "justify-center px-1" : "p-3",
                  activeTaskId === task.id
                    ? isDarkTheme
                      ? "bg-white/5 border-white/10 shadow-lg"
                      : "bg-emerald-50 border-emerald-200"
                    : isDarkTheme
                    ? "border-transparent hover:bg-white/[0.02]"
                    : "border-transparent hover:bg-gray-50"
                )}
                title={isCollapsed ? task.name : ""}
              >
                <button
                  onClick={() => onTaskSwitch(task.id)}
                  className={cn(
                    "flex items-center flex-1",
                    isCollapsed ? "justify-center" : "space-x-3"
                  )}
                >
                  {getTaskIcon(task)}
                  {!isCollapsed && (
                    <span
                      className={`text-xs font-bold truncate ${
                        activeTaskId === task.id
                          ? isDarkTheme
                            ? "text-white"
                            : "text-gray-900"
                          : isDarkTheme
                          ? "text-neutral-400"
                          : "text-gray-600"
                      }`}
                    >
                      {task.name}
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="flex items-center space-x-2">
                    {activeTaskId === task.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    )}
                    <button
                      onClick={(e) => onTaskDelete(task.id, e)}
                      className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                        isDarkTheme
                          ? "text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                          : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                      }`}
                      title={uiLanguage === "zh" ? "关闭任务" : "Close task"}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isCollapsed && tasks.length < maxTasks && (
              <button
                onClick={onTaskAdd}
                className="w-full h-10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors rounded"
                title={uiLanguage === "zh" ? "添加任务" : "Add Task"}
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        <div>
          {!isCollapsed && (
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-3 block mb-4 animate-in fade-in duration-300 ${
                isDarkTheme ? "text-neutral-500" : "text-gray-500"
              }`}
            >
              {labels.options}
            </span>
          )}
          <div className="space-y-1">
            <SidebarLink
              icon={<Workflow size={14} />}
              label={labels.workflow}
              onClick={onWorkflowConfig}
              active={step === "workflow-config"}
              isDarkTheme={isDarkTheme}
              showBadge={true}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              icon={<Languages size={14} />}
              label={labels.language}
              onClick={onLanguageToggle}
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              icon={<SunMoon size={14} />}
              label={labels.theme}
              onClick={onThemeToggle}
              isDarkTheme={isDarkTheme}
              isCollapsed={isCollapsed}
            />
            {import.meta.env.DEV && onTestAgents && (
              <SidebarLink
                icon={<Bug size={14} />}
                label="Test Agents"
                onClick={onTestAgents}
                isDarkTheme={isDarkTheme}
                active={step === "test-agents"}
                isCollapsed={isCollapsed}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={`p-4 border-t text-[10px] font-bold uppercase tracking-widest text-center ${
          isDarkTheme
            ? "border-white/5 text-neutral-600"
            : "border-gray-200 text-gray-500"
        }`}
      >
        {labels.version}
      </div>
    </aside>
  );
};
