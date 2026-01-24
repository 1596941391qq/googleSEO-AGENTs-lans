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
  Languages,
  SunMoon,
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
  id?: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({
  icon,
  label,
  onClick,
  active,
  isDarkTheme = true,
  showBadge = false,
  isCollapsed = false,
  id,
}) => (
  <button
    id={id}
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 ease-out text-xs lg:text-sm font-semibold tracking-wide relative ${
      isCollapsed ? "justify-center space-x-0" : "space-x-3"
    } ${
      active
        ? isDarkTheme
          ? "text-white/90 bg-white/8 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-[1.02]"
          : "text-gray-900 bg-emerald-50 border border-emerald-200 shadow-sm"
        : isDarkTheme
        ? "text-white/60 hover:text-white/90 hover:bg-white/5 border border-transparent hover:scale-[1.01]"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent"
    }`}
    title={isCollapsed ? label : ""}
  >
    <span
      className={`shrink-0 relative flex items-center justify-center transition-opacity duration-300 ${
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

// OptionButton for the bottom section
const OptionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  isDarkTheme: boolean;
  showBadge?: boolean;
}> = ({ icon, label, onClick, active, isDarkTheme, showBadge }) => (
  <button
    onClick={onClick}
    className={cn(
      "p-3 rounded-xl transition-all duration-300 ease-out relative flex items-center justify-center group/opt min-h-[44px] min-w-[44px]",
      active
        ? isDarkTheme
          ? "text-white/90 bg-white/8 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          : "text-gray-900 bg-emerald-50 border border-emerald-200"
        : isDarkTheme
        ? "text-white/60 hover:text-white/90 hover:bg-white/5 border border-transparent hover:scale-[1.05]"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent"
    )}
    title={label}
  >
    <span className="opacity-70 group-hover/opt:opacity-100 transition-opacity duration-300">
      {icon}
    </span>
    {showBadge && (
      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black/20 shadow-sm" />
    )}
  </button>
);

interface SidebarProps {
  tasks: TaskState[];
  activeTaskId: string | null;
  maxTasks: number;
  onTaskSwitch: (taskId: string) => void;
  onTaskAdd: () => void;
  onTaskDelete: (taskId: string, e: React.MouseEvent) => void;
  onWorkflowConfig?: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  uiLanguage: UILanguage;
  step: string;
  isDarkTheme: boolean;
  onContentGeneration?: (
    tab?: "my-website" | "website-data" | "projects" | "publish"
  ) => void;
  contentGenerationTab?:
    | "my-website"
    | "website-data"
    | "projects"
    | "publish";
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
  onDeepDive,
  isCollapsed,
  onToggleCollapse,
}) => {
  const labels =
    uiLanguage === "zh"
      ? {
          myWebsite: "我的网站",
          websiteData: "网站数据",
          projects: "任务看板",
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
          projects: "Projects",
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
      className={`relative border-r flex flex-col shrink-0 transition-all duration-500 ease-out ${
        isCollapsed ? "w-16" : "w-72"
      } ${
        isDarkTheme ? "border-white/10 bg-[#0a0a0a]" : "border-gray-200 bg-white"
      }`}
    >
      {/* Sidebar Toggle Button - Enhanced Visibility */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute -right-3 top-32 w-8 h-8 rounded-full border z-[60] flex items-center justify-center transition-all duration-500 ease-out shadow-[0_8px_30px_rgb(0,0,0,0.3)] group/btn backdrop-blur-sm",
          isDarkTheme
            ? "bg-[#111]/90 border-white/20 text-white/70 hover:text-white hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-110"
            : "bg-white border-gray-300 text-gray-500 hover:text-emerald-600 hover:border-emerald-600 shadow-sm hover:scale-110"
        )}
      >
        <TrendingUp
          size={14}
          className={cn(
            "transition-all duration-500 ease-out",
            isCollapsed
              ? "rotate-90 scale-125"
              : "-rotate-90 group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110"
          )}
        />
        {/* Hover ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-400/0 group-hover/btn:scale-125 group-hover/btn:border-emerald-400/30 transition-all duration-500 pointer-events-none"></div>
      </button>

      <div
        className={cn(
          "p-8 border-b transition-all duration-500",
          isCollapsed ? "px-4" : "p-8",
          isDarkTheme ? "border-white/10" : "border-gray-200"
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
                  "text-xs lg:text-sm font-bold tracking-wide leading-tight",
                  isDarkTheme ? "text-white/90" : "text-gray-900"
                )}
              >
                Niche Digger
              </h1>
              <p className="text-[9px] lg:text-xs text-emerald-400 font-semibold tracking-tight mt-1">
                Mine Hidden Alpha
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
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
              id="driver-website-data"
            />
            <SidebarLink
              icon={<TrendingUp size={14} />}
              label={labels.projects}
              onClick={() => onContentGeneration("projects")}
              active={
                step === "content-generation" &&
                contentGenerationTab === "projects"
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

        <div id="driver-active-tasks-section">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-4 mb-4 animate-in fade-in duration-500">
              <span
                className={`text-[10px] lg:text-xs font-semibold tracking-wide ${
                  isDarkTheme ? "text-white/60" : "text-gray-500"
                }`}
              >
                {labels.activeTasks}
              </span>
              {tasks.length < maxTasks && (
                <button
                  id="driver-add-task"
                  onClick={onTaskAdd}
                  className="text-emerald-400 hover:text-emerald-300 p-1.5 transition-all duration-300 hover:scale-110 rounded-lg hover:bg-emerald-400/10"
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
                  "group flex items-center justify-between p-4 rounded-xl transition-all duration-300 ease-out border",
                  isCollapsed ? "justify-center px-2" : "p-4",
                  activeTaskId === task.id
                    ? isDarkTheme
                      ? "bg-white/8 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-[1.02]"
                      : "bg-emerald-50 border-emerald-200 shadow-sm"
                    : isDarkTheme
                    ? "border-transparent hover:bg-white/5 hover:border-white/5"
                    : "border-transparent hover:bg-gray-50"
                )}
                title={isCollapsed ? task.name : task.name}
              >
                <button
                  onClick={() => onTaskSwitch(task.id)}
                  className={cn(
                    "flex items-center flex-1 min-w-0",
                    isCollapsed ? "justify-center" : "space-x-3"
                  )}
                >
                  {getTaskIcon(task)}
                  {!isCollapsed && (
                    <span
                      className={`text-xs lg:text-sm font-semibold truncate min-w-0 transition-colors duration-300 ${
                        activeTaskId === task.id
                          ? isDarkTheme
                            ? "text-white/90"
                            : "text-gray-900"
                          : isDarkTheme
                          ? "text-white/60"
                          : "text-gray-600"
                      }`}
                      title={task.name}
                    >
                      {task.name}
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {activeTaskId === task.id && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] flex-shrink-0 animate-pulse" />
                    )}
                    <button
                      onClick={(e) => onTaskDelete(task.id, e)}
                      className={`p-1.5 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100 flex-shrink-0 hover:scale-110 ${
                        isDarkTheme
                          ? "text-white/60 hover:text-red-400 hover:bg-red-400/10"
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
              className={`text-[10px] lg:text-xs font-semibold tracking-wide px-4 block mb-4 animate-in fade-in duration-500 ${
                isDarkTheme ? "text-white/60" : "text-gray-500"
              }`}
            >
              {labels.options}
            </span>
          )}
          <div className={cn(
            "flex gap-2",
            isCollapsed ? "flex-col items-center" : "flex-row items-center px-4"
          )}>
            <OptionButton
              icon={
                <div className="flex items-center justify-center w-4 h-4 text-[10px] font-black tracking-tighter">
                  {uiLanguage === "zh" ? "EN" : "中"}
                </div>
              }
              label={labels.language}
              onClick={onLanguageToggle}
              isDarkTheme={isDarkTheme}
            />
            <OptionButton
              icon={<SunMoon size={14} />}
              label={labels.theme}
              onClick={onThemeToggle}
              isDarkTheme={isDarkTheme}
            />
          </div>
        </div>
      </div>

      <div
        className={`p-6 border-t text-[10px] lg:text-xs font-semibold tracking-wide text-center transition-colors duration-300 ${
          isDarkTheme
            ? "border-white/10 text-white/40"
            : "border-gray-200 text-gray-500"
        }`}
      >
        {labels.version}
      </div>
    </aside>
  );
};
