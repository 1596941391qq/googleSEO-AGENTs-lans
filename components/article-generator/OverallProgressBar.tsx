import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type GenerationStage = 'input' | 'research' | 'strategy' | 'writing' | 'visualizing' | 'complete';

export interface OverallProgressBarProps {
  currentStage: GenerationStage;
  progress: number; // 0-100
  estimatedTime?: number; // seconds
  uiLanguage?: 'en' | 'zh';
  isDarkTheme?: boolean;
  className?: string;
}

const STAGE_INFO: Record<GenerationStage, { en: string; zh: string; icon: React.ReactNode }> = {
  input: { 
    en: 'Input Configuration', 
    zh: '输入配置',
    icon: null
  },
  research: { 
    en: 'Research & Analysis', 
    zh: '研究与分析',
    icon: <Loader2 className="animate-spin text-blue-500" size={16} />
  },
  strategy: { 
    en: 'Strategy Planning', 
    zh: '策略规划',
    icon: <Loader2 className="animate-spin text-emerald-500" size={16} />
  },
  writing: { 
    en: 'Content Writing', 
    zh: '内容撰写',
    icon: <Loader2 className="animate-spin text-amber-500" size={16} />
  },
  visualizing: { 
    en: 'Image Generation', 
    zh: '图像生成',
    icon: <Loader2 className="animate-spin text-purple-500" size={16} />
  },
  complete: { 
    en: 'Complete', 
    zh: '完成',
    icon: <CheckCircle className="text-emerald-500" size={16} />
  },
};

const STAGE_PROGRESS: Record<GenerationStage, number> = {
  input: 0,
  research: 20,
  strategy: 40,
  writing: 60,
  visualizing: 80,
  complete: 100,
};

export const OverallProgressBar: React.FC<OverallProgressBarProps> = ({
  currentStage,
  progress,
  estimatedTime,
  uiLanguage = 'en',
  isDarkTheme = true,
  className,
}) => {
  const stageInfo = STAGE_INFO[currentStage];
  const stageProgress = STAGE_PROGRESS[currentStage];
  const isComplete = currentStage === 'complete';

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return uiLanguage === 'zh' ? `${seconds}秒` : `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return uiLanguage === 'zh' ? `${mins}分${secs}秒` : `${mins}m ${secs}s`;
  };

  return (
    <div className={cn(
      "backdrop-blur-sm rounded-xl shadow-sm border p-6 space-y-4",
      isDarkTheme
        ? "bg-black/40 border-emerald-500/20"
        : "bg-white/90 border-emerald-500/30",
      className
    )}>
      {/* Stage Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {stageInfo.icon}
          <div>
            <div className={cn(
              "text-sm font-bold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}>
              {uiLanguage === 'zh' ? stageInfo.zh : stageInfo.en}
            </div>
            <div className={cn(
              "text-xs",
              isDarkTheme ? "text-gray-400" : "text-gray-600"
            )}>
              {uiLanguage === 'zh' ? '正在处理...' : 'Processing...'}
            </div>
          </div>
        </div>
        <div className="text-sm font-bold text-emerald-400">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className={cn(
          "w-full rounded-full h-3 overflow-hidden",
          isDarkTheme ? "bg-black/60" : "bg-gray-200"
        )}>
          <div
            className={cn(
              "h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden",
              progress === 0 && "animate-pulse"
            )}
            style={{ width: `${Math.max(progress, 2)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Stage Markers */}
        <div className={cn(
          "flex justify-between text-[10px]",
          isDarkTheme ? "text-gray-500" : "text-gray-600"
        )}>
          {Object.entries(STAGE_PROGRESS).map(([stage, stageProg]) => {
            if (stage === 'input' || stage === 'complete') return null;
            const isActive = STAGE_PROGRESS[currentStage] >= stageProg;
            const isCurrent = currentStage === stage;
            return (
              <div
                key={stage}
                className={cn(
                  "flex-1 text-center",
                  isActive && "text-emerald-400",
                  isCurrent && "font-bold"
                )}
              >
                {STAGE_INFO[stage as GenerationStage][uiLanguage === 'zh' ? 'zh' : 'en']}
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimated Time */}
      {!isComplete && estimatedTime && estimatedTime > 0 && (
        <div className={cn(
          "text-xs text-center",
          isDarkTheme ? "text-gray-500" : "text-gray-600"
        )}>
          {uiLanguage === 'zh' 
            ? `预计剩余时间: ${formatTime(estimatedTime)}`
            : `Estimated time remaining: ${formatTime(estimatedTime)}`
          }
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className="text-center text-emerald-400 text-sm font-medium">
          {uiLanguage === 'zh' ? '✓ 生成完成！' : '✓ Generation Complete!'}
        </div>
      )}
    </div>
  );
};

