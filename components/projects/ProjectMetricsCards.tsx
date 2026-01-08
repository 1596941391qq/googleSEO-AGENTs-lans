import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { Folder, Hash, FileText, Send } from 'lucide-react';

interface ProjectMetricsCardsProps {
  stats: {
    totalProjects: number;
    totalKeywords: number;
    totalDrafts: number;
    totalPublished: number;
  };
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const ProjectMetricsCards: React.FC<ProjectMetricsCardsProps> = ({
  stats,
  isDarkTheme,
  uiLanguage,
}) => {
  const metrics = [
    {
      label: uiLanguage === 'zh' ? '总项目数' : 'Total Projects',
      value: stats.totalProjects,
      icon: <Folder className="w-4 h-4 text-blue-500" />,
    },
    {
      label: uiLanguage === 'zh' ? '总关键词' : 'Total Keywords',
      value: stats.totalKeywords,
      icon: <Hash className="w-4 h-4 text-emerald-500" />,
    },
    {
      label: uiLanguage === 'zh' ? '内容草稿' : 'Content Drafts',
      value: stats.totalDrafts,
      icon: <FileText className="w-4 h-4 text-purple-500" />,
    },
    {
      label: uiLanguage === 'zh' ? '已发布' : 'Published',
      value: stats.totalPublished,
      icon: <Send className="w-4 h-4 text-orange-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className={cn(
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div
                className={cn(
                  'text-xs font-medium',
                  isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                )}
              >
                {metric.label}
              </div>
              {metric.icon}
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                isDarkTheme ? 'text-white' : 'text-gray-900'
              )}
            >
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
