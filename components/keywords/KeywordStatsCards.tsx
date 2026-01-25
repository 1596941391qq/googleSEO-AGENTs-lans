import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { Hash, TrendingUp, AlertCircle, AlertTriangle } from 'lucide-react';

interface KeywordStats {
  totalKeywords: number;
  highProbability: number;
  mediumProbability: number;
  lowProbability: number;
}

interface KeywordStatsCardsProps {
  stats: KeywordStats;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const KeywordStatsCards: React.FC<KeywordStatsCardsProps> = ({
  stats,
  isDarkTheme,
  uiLanguage,
}) => {
  const cards = [
    {
      icon: Hash,
      label: uiLanguage === 'zh' ? '总关键词数' : 'Total Keywords',
      value: stats.totalKeywords,
      color: 'text-blue-500',
      bgColor: isDarkTheme ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    {
      icon: TrendingUp,
      label: uiLanguage === 'zh' ? '高概率词数' : 'High Probability',
      value: stats.highProbability,
      color: 'text-emerald-500',
      bgColor: isDarkTheme ? 'bg-emerald-500/10' : 'bg-emerald-50',
    },
    {
      icon: AlertCircle,
      label: uiLanguage === 'zh' ? '中概率词数' : 'Medium Probability',
      value: stats.mediumProbability,
      color: 'text-amber-500',
      bgColor: isDarkTheme ? 'bg-amber-500/10' : 'bg-amber-50',
    },
    {
      icon: AlertTriangle,
      label: uiLanguage === 'zh' ? '低概率词数' : 'Low Probability',
      value: stats.lowProbability,
      color: 'text-red-500',
      bgColor: isDarkTheme ? 'bg-red-500/10' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={cn(
            'transition-all',
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className={cn('text-[10px] font-medium uppercase tracking-wider', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                  {card.label}
                </p>
                <p className={cn('text-xl font-bold', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
