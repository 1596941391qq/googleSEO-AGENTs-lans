import React from 'react';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface QualityScore {
  title_standard: number; // 0-10
  summary: number; // 0-15
  information_gain: number; // 0-25
  format_engineering: number; // 0-20
  entity_engineering: number; // 0-10
  comparison: number; // 0-10
  faq: number; // 0-10
}

export interface QualityScoreCardProps {
  scores: QualityScore;
  totalScore: number; // 0-100
  rating?: 'usable' | 'ai-summary-ready' | 'master-copy' | 'needs-optimization';
  uiLanguage?: 'en' | 'zh';
  isDarkTheme?: boolean;
  className?: string;
}

const MAX_SCORES: QualityScore = {
  title_standard: 10,
  summary: 15,
  information_gain: 25,
  format_engineering: 20,
  entity_engineering: 10,
  comparison: 10,
  faq: 10,
};

const DIMENSION_NAMES: Record<keyof QualityScore, { en: string; zh: string }> = {
  title_standard: { en: 'Title Standard', zh: '标题规范' },
  summary: { en: 'Summary', zh: '首屏摘要' },
  information_gain: { en: 'Information Gain', zh: '信息增益' },
  format_engineering: { en: 'Format Engineering', zh: '格式工程' },
  entity_engineering: { en: 'Entity Engineering', zh: '实体工程' },
  comparison: { en: 'Comparison', zh: '对比区' },
  faq: { en: 'FAQ Quality', zh: 'FAQ质量' },
};

const RATING_INFO: Record<string, { en: string; zh: string; color: string; icon: React.ReactNode }> = {
  'master-copy': {
    en: 'Master Copy (90-100)',
    zh: '长期可复用母稿 (90-100)',
    color: 'emerald',
    icon: <CheckCircle className="text-emerald-500" size={16} />
  },
  'ai-summary-ready': {
    en: 'AI Summary Ready (80-89)',
    zh: '可进入AI摘要 (80-89)',
    color: 'blue',
    icon: <TrendingUp className="text-blue-500" size={16} />
  },
  'usable': {
    en: 'Usable GEO Content (70-79)',
    zh: '可用GEO内容 (70-79)',
    color: 'amber',
    icon: <AlertCircle className="text-amber-500" size={16} />
  },
  'needs-optimization': {
    en: 'Needs Optimization (<70)',
    zh: '需要优化 (<70)',
    color: 'red',
    icon: <AlertCircle className="text-red-500" size={16} />
  },
};

const getScoreColor = (score: number, max: number) => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return 'emerald';
  if (percentage >= 60) return 'blue';
  if (percentage >= 40) return 'amber';
  return 'red';
};

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({
  scores,
  totalScore,
  rating = 'needs-optimization',
  uiLanguage = 'en',
  isDarkTheme = true,
  className,
}) => {
  const ratingInfo = RATING_INFO[rating] || RATING_INFO['needs-optimization'];

  // Determine rating based on score if not provided
  const actualRating = rating || (
    totalScore >= 90 ? 'master-copy' :
    totalScore >= 80 ? 'ai-summary-ready' :
    totalScore >= 70 ? 'usable' :
    'needs-optimization'
  );

  const actualRatingInfo = RATING_INFO[actualRating];

  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-4",
      isDarkTheme 
        ? "bg-blue-500/5 border-blue-500/20" 
        : "bg-blue-50 border-blue-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className={isDarkTheme ? "text-blue-400" : "text-blue-600"} size={16} />
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            isDarkTheme ? "text-blue-300" : "text-blue-700"
          )}>
            {uiLanguage === 'zh' ? 'GEO质量评分' : 'GEO Quality Score'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {actualRatingInfo.icon}
          <div className={cn(
            "text-sm font-bold",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}>
            {totalScore}/100
          </div>
        </div>
      </div>

      {/* Rating Badge */}
      <div className={cn(
        "inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium",
        `bg-${actualRatingInfo.color}-500/20 border border-${actualRatingInfo.color}-500/50 text-${actualRatingInfo.color}-300`
      )}>
        {actualRatingInfo.icon}
        <span>{uiLanguage === 'zh' ? actualRatingInfo.zh : actualRatingInfo.en}</span>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3">
        {(Object.keys(scores) as Array<keyof QualityScore>).map((key) => {
          const score = scores[key];
          const max = MAX_SCORES[key];
          const percentage = (score / max) * 100;
          const color = getScoreColor(score, max);
          const dimensionName = DIMENSION_NAMES[key][uiLanguage === 'zh' ? 'zh' : 'en'];

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{dimensionName}</span>
                <span className={cn(
                  "font-mono font-medium",
                  `text-${color}-400`
                )}>
                  {score}/{max}
                </span>
              </div>
              <div className={cn(
                "w-full rounded-full h-2 overflow-hidden",
                isDarkTheme ? "bg-black/40" : "bg-gray-200"
              )}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    `bg-${color}-500`
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

