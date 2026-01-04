import React from "react";
import { Search, Languages, FileText, X, Sparkles } from "lucide-react";
import { TaskType, UILanguage } from "../../types";

interface TaskMenuModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: (type: TaskType) => void;
  uiLanguage: UILanguage;
}

const TEXT = {
  zh: {
    tabMining: "关键词挖掘",
    tabBatch: "跨市场洞察",
    tabArticleGenerator: "AI 图文工场",
  },
  en: {
    tabMining: "Keyword Mining",
    tabBatch: "Cross-Market Insight",
    tabArticleGenerator: "Article Generator",
  },
};

export const TaskMenuModal: React.FC<TaskMenuModalProps> = ({
  show,
  onClose,
  onCreate,
  uiLanguage,
}) => {
  if (!show) return null;

  const t = TEXT[uiLanguage];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-black/90 border border-emerald-500/30 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">
            {uiLanguage === "zh" ? "创建新任务" : "Create New Task"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onCreate("mining");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors group"
          >
            <Search className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-white">{t.tabMining}</div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "基于种子关键词挖掘相关关键词"
                  : "Mine keywords from seed keyword"}
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreate("batch");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors group"
          >
            <Languages className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-white">{t.tabBatch}</div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "批量翻译和分析关键词"
                  : "Batch translate and analyze keywords"}
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreate("article-generator");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors group"
          >
            <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="font-semibold text-white">
                {t.tabArticleGenerator}
              </div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "自动生成高度优化的 SEO 文章与配图"
                  : "Auto-generate SEO articles with visuals"}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
