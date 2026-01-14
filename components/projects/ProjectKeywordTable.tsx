import React from 'react';
import { cn } from '../../lib/utils';
import { KeywordWithStatus } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sparkles, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProjectKeywordTableProps {
  keywords: KeywordWithStatus[];
  onGenerate: (keyword: KeywordWithStatus) => void;
  onViewDraft: (keyword: KeywordWithStatus) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  readOnly?: boolean;
}

export const ProjectKeywordTable: React.FC<ProjectKeywordTableProps> = ({
  keywords,
  onGenerate,
  onViewDraft,
  isDarkTheme,
  uiLanguage,
  readOnly = false,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generating':
        return (
          <Badge variant="outline" className="border-blue-500/50 text-blue-500 bg-blue-500/5 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {uiLanguage === 'zh' ? '生成中' : 'Generating'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {uiLanguage === 'zh' ? '已完成' : 'Completed'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {uiLanguage === 'zh' ? '失败' : 'Failed'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-zinc-500">
            {uiLanguage === 'zh' ? '待处理' : 'Selected'}
          </Badge>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={cn('border-b text-[10px] uppercase tracking-wider', isDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-gray-200 text-gray-500')}>
            <th className="text-left py-3 px-4 font-medium">{uiLanguage === 'zh' ? '关键词' : 'Keyword'}</th>
            <th className="text-center py-3 px-4 font-medium">{uiLanguage === 'zh' ? '搜索量' : 'Volume'}</th>
            <th className="text-center py-3 px-4 font-medium">{uiLanguage === 'zh' ? '难度' : 'Difficulty'}</th>
            <th className="text-center py-3 px-4 font-medium">{uiLanguage === 'zh' ? '状态' : 'Status'}</th>
            {!readOnly && <th className="text-right py-3 px-4 font-medium">{uiLanguage === 'zh' ? '操作' : 'Actions'}</th>}
          </tr>
        </thead>
        <tbody>
          {keywords.map((kw) => (
            <tr
              key={kw.id}
              className={cn(
                'border-b transition-colors',
                isDarkTheme ? 'border-zinc-800 hover:bg-white/[0.01]' : 'border-gray-50 hover:bg-gray-50'
              )}
            >
              <td className="py-3 px-4">
                <div className="flex flex-col">
                  <span className={cn('font-medium text-sm', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                    {kw.keyword}
                  </span>
                  {kw.translation && (
                    <span className={cn('text-[10px] mt-0.5', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                      {kw.translation}
                    </span>
                  )}
                </div>
              </td>
              <td className="text-center py-3 px-4">
                <span className={cn('text-xs font-mono', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                  {kw.volume?.toLocaleString() || '-'}
                </span>
              </td>
              <td className="text-center py-3 px-4">
                <span className={cn('text-xs font-mono', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                  {kw.probability || '-'}
                </span>
              </td>
              <td className="text-center py-3 px-4">
                {getStatusBadge(kw.status)}
              </td>
              {!readOnly && (
                <td className="text-right py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {(kw.status === 'completed' || kw.content_status === 'draft') ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => onViewDraft(kw)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {uiLanguage === 'zh' ? '查看草稿' : 'View Draft'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1.5",
                          isDarkTheme ? "border-zinc-800 hover:bg-zinc-800" : "border-gray-200 hover:bg-gray-100"
                        )}
                        onClick={() => onGenerate(kw)}
                        disabled={kw.status === 'generating'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        {uiLanguage === 'zh' ? '一键生成' : 'Generate'}
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
