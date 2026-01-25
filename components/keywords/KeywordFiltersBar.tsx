import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { Search, RefreshCw, Download, Trash2, Filter } from 'lucide-react';
import { ProbabilityLevel, IntentType } from '../../types';

export interface KeywordFilters {
  search: string;
  probability: ProbabilityLevel[];
  intent: IntentType[];
  language: string[];
  projectIds: string[];
  status: ('pending' | 'generated' | 'published')[];
}

interface KeywordFiltersBarProps {
  filters: KeywordFilters;
  onFiltersChange: (filters: KeywordFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  onBatchDelete: () => void;
  selectedCount: number;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  projects: Array<{ id: string; name: string; keyword_count: number }>;
}

export const KeywordFiltersBar: React.FC<KeywordFiltersBarProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onBatchDelete,
  selectedCount,
  isDarkTheme,
  uiLanguage,
  projects,
}) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleProbabilityChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, probability: [] });
    } else {
      onFiltersChange({ ...filters, probability: [value as ProbabilityLevel] });
    }
  };

  const handleIntentChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, intent: [] });
    } else {
      onFiltersChange({ ...filters, intent: [value as IntentType] });
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, projectIds: [] });
    } else {
      onFiltersChange({ ...filters, projectIds: [value] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Primary Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDarkTheme ? 'text-zinc-500' : 'text-gray-400')} />
          <Input
            type="text"
            placeholder={uiLanguage === 'zh' ? '搜索关键词...' : 'Search keywords...'}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'pl-10 font-medium',
              isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>

        {/* Probability Filter */}
        <Select value={filters.probability[0] || 'all'} onValueChange={handleProbabilityChange}>
          <SelectTrigger className={cn('w-full lg:w-[180px] font-medium', isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder={uiLanguage === 'zh' ? '概率' : 'Probability'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{uiLanguage === 'zh' ? '全部概率' : 'All Probability'}</SelectItem>
            <SelectItem value="High">{uiLanguage === 'zh' ? '高概率' : 'High'}</SelectItem>
            <SelectItem value="Medium">{uiLanguage === 'zh' ? '中概率' : 'Medium'}</SelectItem>
            <SelectItem value="Low">{uiLanguage === 'zh' ? '低概率' : 'Low'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Intent Filter */}
        <Select value={filters.intent[0] || 'all'} onValueChange={handleIntentChange}>
          <SelectTrigger className={cn('w-full lg:w-[180px] font-medium', isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <SelectValue placeholder={uiLanguage === 'zh' ? '意图' : 'Intent'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{uiLanguage === 'zh' ? '全部意图' : 'All Intent'}</SelectItem>
            <SelectItem value="Commercial">{uiLanguage === 'zh' ? '商业' : 'Commercial'}</SelectItem>
            <SelectItem value="Informational">{uiLanguage === 'zh' ? '信息' : 'Informational'}</SelectItem>
            <SelectItem value="Navigational">{uiLanguage === 'zh' ? '导航' : 'Navigational'}</SelectItem>
            <SelectItem value="Transactional">{uiLanguage === 'zh' ? '交易' : 'Transactional'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Project Filter */}
        <Select value={filters.projectIds[0] || 'all'} onValueChange={handleProjectChange}>
          <SelectTrigger className={cn('w-full lg:w-[200px] font-medium', isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <SelectValue placeholder={uiLanguage === 'zh' ? '项目' : 'Project'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{uiLanguage === 'zh' ? '全部项目' : 'All Projects'}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name} ({project.keyword_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className={cn('font-medium', isDarkTheme ? 'border-zinc-800 hover:bg-zinc-800' : 'border-gray-200 hover:bg-gray-100')}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {uiLanguage === 'zh' ? '刷新' : 'Refresh'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className={cn('font-medium', isDarkTheme ? 'border-zinc-800 hover:bg-zinc-800' : 'border-gray-200 hover:bg-gray-100')}
        >
          <Download className="w-4 h-4 mr-2" />
          {uiLanguage === 'zh' ? '导出' : 'Export'}
        </Button>

        {selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchDelete}
            className={cn('font-medium text-red-500 border-red-500/20 hover:bg-red-500/10')}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {uiLanguage === 'zh' ? `删除 (${selectedCount})` : `Delete (${selectedCount})`}
          </Button>
        )}
      </div>
    </div>
  );
};
