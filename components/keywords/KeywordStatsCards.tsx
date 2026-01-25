import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { Hash, TrendingUp, FileText, Clock } from 'lucide-react';

interface KeywordStats {
  totalKeywords: number;
  highProbability: number;
  contentGenerated: number;
  pendingKeywords: number;
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
      icon: FileText,
      label: uiLanguage === 'zh' ? '已生成内容' : 'Content Generated',
      value: stats.contentGenerated,
      color: 'text-purple-500',
      bgColor: isDarkTheme ? 'bg-purple-500/10' : 'bg-purple-50',
    },
    {
      icon: Clock,
      label: uiLanguage === 'zh' ? '待处理词数' : 'Pending Keywords',
      value: stats.pendingKeywords,
      color: 'text-amber-500',
      bgColor: isDarkTheme ? 'bg-amber-500/10' : 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={cn(
            'transition-all hover:scale-[1.02]',
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className={cn('text-xs font-medium uppercase tracking-wider', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                  {card.label}
                </p>
                <p className={cn('text-3xl font-bold', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={cn('p-3 rounded-lg', card.bgColor)}>
                <card.icon className={cn('w-6 h-6', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
