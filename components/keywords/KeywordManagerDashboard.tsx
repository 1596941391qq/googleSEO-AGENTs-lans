import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { KeywordStatsCards } from './KeywordStatsCards';
import { KeywordFiltersBar, KeywordFilters } from './KeywordFiltersBar';
import { KeywordDataTable, SortConfig } from './KeywordDataTable';
import { KeywordPagination, PaginationConfig } from './KeywordPagination';
import { KeywordWithStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserId } from '../website-data/utils';
import { Loader2 } from 'lucide-react';

interface KeywordManagerDashboardProps {
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  onGenerateContent: (keyword: KeywordWithStatus) => void;
  onViewDraft: (keyword: KeywordWithStatus) => void;
}

interface KeywordStats {
  totalKeywords: number;
  highProbability: number;
  mediumProbability: number;
  lowProbability: number;
}

export const KeywordManagerDashboard: React.FC<KeywordManagerDashboardProps> = ({
  isDarkTheme,
  uiLanguage,
  onGenerateContent,
  onViewDraft,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);

  const [keywords, setKeywords] = useState<KeywordWithStatus[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<KeywordWithStatus[]>([]);
  const [stats, setStats] = useState<KeywordStats>({
    totalKeywords: 0,
    highProbability: 0,
    mediumProbability: 0,
    lowProbability: 0,
  });
  const [filters, setFilters] = useState<KeywordFilters>({
    search: '',
    probability: [],
    source: [],
    language: [],
    projectIds: [],
    status: [],
    favorited: null, // null = all, true = favorited only, false = not favorited
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'created_at',
    order: 'desc',
  });
  const [pagination, setPagination] = useState<PaginationConfig>({
    currentPage: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
  });
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; keyword_count: number }>>([]);

  // Load favorited keywords from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('keyword_favorites');
      if (stored) {
        const favoriteArray = JSON.parse(stored);
        setFavoritedIds(new Set(favoriteArray));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Save favorited keywords to localStorage
  const saveFavorites = (favorites: Set<string>) => {
    try {
      localStorage.setItem('keyword_favorites', JSON.stringify(Array.from(favorites)));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveFavorites(next);
      return next;
    });
  };

  // Fetch all keywords and projects
  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch keywords from all projects
      const keywordsResponse = await fetch(`/api/keywords/list?userId=${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
      const keywordsResult = await keywordsResponse.json();

      if (keywordsResult.success) {
        const allKeywords = keywordsResult.data.keywords || [];
        setKeywords(allKeywords);

        // Calculate stats
        const stats: KeywordStats = {
          totalKeywords: allKeywords.length,
          highProbability: allKeywords.filter((k: KeywordWithStatus) => k.probability === 'High').length,
          mediumProbability: allKeywords.filter((k: KeywordWithStatus) => k.probability === 'Medium').length,
          lowProbability: allKeywords.filter((k: KeywordWithStatus) => k.probability === 'Low').length,
        };
        setStats(stats);

        // Extract unique projects
        const projectMap = new Map<string, { id: string; name: string; keyword_count: number }>();
        allKeywords.forEach((k: KeywordWithStatus) => {
          if (k.project_id && k.project_name) {
            if (!projectMap.has(k.project_id)) {
              projectMap.set(k.project_id, {
                id: k.project_id,
                name: k.project_name,
                keyword_count: 0,
              });
            }
            const project = projectMap.get(k.project_id)!;
            project.keyword_count++;
          }
        });
        setProjects(Array.from(projectMap.values()));
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...keywords];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(k =>
        k.keyword.toLowerCase().includes(searchLower) ||
        (k.translation && k.translation.toLowerCase().includes(searchLower))
      );
    }

    // Apply probability filter
    if (filters.probability.length > 0) {
      result = result.filter(k => filters.probability.includes(k.probability));
    }

    // Apply source filter
    if (filters.source.length > 0) {
      result = result.filter(k => k.source && filters.source.includes(k.source));
    }

    // Apply project filter
    if (filters.projectIds.length > 0) {
      result = result.filter(k => k.project_id && filters.projectIds.includes(k.project_id));
    }

    // Apply favorited filter
    if (filters.favorited !== null) {
      if (filters.favorited === true) {
        result = result.filter(k => favoritedIds.has(k.id));
      } else {
        result = result.filter(k => !favoritedIds.has(k.id));
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.field];
      let bValue: any = b[sortConfig.field];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convert to comparable values
      if (sortConfig.field === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredKeywords(result);

    // Update pagination
    const totalPages = Math.ceil(result.length / pagination.pageSize);
    setPagination(prev => ({
      ...prev,
      totalItems: result.length,
      totalPages,
      currentPage: Math.min(prev.currentPage, totalPages || 1),
    }));
  }, [keywords, filters, sortConfig, pagination.pageSize]);

  // Get paginated keywords
  const paginatedKeywords = filteredKeywords.slice(
    (pagination.currentPage - 1) * pagination.pageSize,
    pagination.currentPage * pagination.pageSize
  );

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedKeywords.map(k => k.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleExport = () => {
    // Export to CSV
    const headers = ['Keyword', 'Translation', 'Intent', 'Volume', 'Difficulty', 'Probability', 'Project', 'Created'];
    const rows = filteredKeywords.map(k => [
      k.keyword,
      k.translation || '',
      k.intent,
      k.volume || '',
      k.difficulty || '',
      k.probability,
      k.project_name || '',
      k.created_at || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = uiLanguage === 'zh'
      ? `确定要删除选中的 ${selectedIds.length} 个关键词吗？`
      : `Are you sure you want to delete ${selectedIds.length} selected keywords?`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch('/api/keywords/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          keywordIds: selectedIds,
          userId: currentUserId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSelectedIds([]);
        fetchData();
      } else {
        alert(result.error || 'Failed to delete keywords');
      }
    } catch (error) {
      console.error('Failed to delete keywords:', error);
      alert('Failed to delete keywords');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className={cn('text-xl font-bold tracking-tight', isDarkTheme ? 'text-white' : 'text-gray-900')}>
          {uiLanguage === 'zh' ? '关键词管理' : 'Keyword Manager'}
        </h1>
        <p className={cn('text-[10px] font-medium uppercase tracking-wider', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
          {uiLanguage === 'zh' ? '统一管理所有挖掘任务的关键词，支持筛选、排序、批量操作' : 'Manage all keywords with filters, sorting, and batch operations'}
        </p>
      </div>

      {/* Stats Cards */}
      <KeywordStatsCards stats={stats} isDarkTheme={isDarkTheme} uiLanguage={uiLanguage} />

      {/* Filters Bar */}
      <KeywordFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={fetchData}
        onExport={handleExport}
        onBatchDelete={handleBatchDelete}
        selectedCount={selectedIds.length}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
        projects={projects}
      />

      {/* Data Table */}
      <Card className={cn(isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
        <CardContent className="p-0">
          <KeywordDataTable
            keywords={paginatedKeywords}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onSort={handleSort}
            sortConfig={sortConfig}
            onGenerate={onGenerateContent}
            onViewDraft={onViewDraft}
            isDarkTheme={isDarkTheme}
            uiLanguage={uiLanguage}
          />

          {/* Pagination */}
          {filteredKeywords.length > 0 && (
            <div className="px-6 pb-6">
              <KeywordPagination
                pagination={pagination}
                onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                onPageSizeChange={(pageSize) => setPagination(prev => ({ ...prev, pageSize, currentPage: 1 }))}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
