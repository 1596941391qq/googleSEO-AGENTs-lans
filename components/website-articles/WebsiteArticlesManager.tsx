import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Website, Article, WebsiteArticlesState, SortField, ArticleFilters } from './types';
import { WebsiteSelector } from './WebsiteSelector';
import { ArticleTable } from './ArticleTable';
import { ArticleDrawer } from './ArticleDrawer';
import { BatchActions } from './BatchActions';
import { Button } from '../ui/button';
import { Plus, Filter, Search, RefreshCw } from 'lucide-react';

interface WebsiteArticlesManagerProps {
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const WebsiteArticlesManager: React.FC<WebsiteArticlesManagerProps> = ({
  isDarkTheme,
  uiLanguage,
}) => {
  const [state, setState] = useState<WebsiteArticlesState>({
    selectedWebsite: null,
    articles: [],
    selectedArticles: [],
    filters: {},
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    drawerOpen: false,
    activeArticle: null,
  });

  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration - Replace with actual API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockWebsites: Website[] = [
        {
          id: '1',
          domain: 'example.com',
          url: 'https://example.com',
          totalArticles: 45,
          publishedCount: 23,
          rankingCount: 12,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          domain: 'demo.io',
          url: 'https://demo.io',
          totalArticles: 32,
          publishedCount: 18,
          rankingCount: 8,
          createdAt: new Date().toISOString(),
        },
      ];

      const mockArticles: Article[] = [
        {
          id: '1',
          websiteId: '1',
          title: 'Best AI Tools for 2026',
          keyword: 'ai tools',
          intent: 'commercial',
          urlPath: '/guide/ai-tools',
          platform: 'rtd',
          status: 'published',
          ranking: 8,
          traffic: 1250,
          content: 'This is a comprehensive guide about AI tools...',
          metaDescription: 'Discover the best AI tools for productivity in 2026',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          websiteId: '1',
          title: 'Top 10 SaaS Applications',
          keyword: 'saas apps',
          intent: 'commercial',
          urlPath: '/lab/saas-apps',
          platform: 'github',
          status: 'ranking',
          ranking: 15,
          content: 'Exploring the top SaaS applications...',
          metaDescription: 'A detailed review of top SaaS applications',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          websiteId: '1',
          title: 'How to Start a Startup',
          keyword: 'startup guide',
          intent: 'informational',
          urlPath: '/compare/startup-guide',
          platform: 'none',
          status: 'draft',
          content: 'A comprehensive guide to starting your own startup...',
          metaDescription: 'Learn how to start and grow your startup',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          websiteId: '1',
          title: 'Marketing Guide for Beginners',
          keyword: 'marketing tips',
          intent: 'informational',
          urlPath: '/tool/marketing-guide',
          platform: 'rtd',
          status: 'published',
          ranking: 25,
          content: 'Essential marketing strategies for beginners...',
          metaDescription: 'Master marketing basics with this guide',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '5',
          websiteId: '1',
          title: 'Failed SEO Experiment',
          keyword: 'seo tips',
          intent: 'informational',
          urlPath: '',
          platform: 'none',
          status: 'failed',
          content: 'This article did not perform well...',
          metaDescription: 'SEO tips that did not work',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setWebsites(mockWebsites);
      setState(prev => ({
        ...prev,
        selectedWebsite: mockWebsites[0],
        articles: mockArticles,
      }));
      setLoading(false);
    }, 500);
  }, []);

  const handleSelectWebsite = (website: Website) => {
    setState(prev => ({
      ...prev,
      selectedWebsite: website,
      selectedArticles: [],
    }));
    // TODO: Fetch articles for selected website
  };

  const handleSelectArticle = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedArticles: prev.selectedArticles.includes(id)
        ? prev.selectedArticles.filter(aid => aid !== id)
        : [...prev.selectedArticles, id],
    }));
  };

  const handleSelectAll = () => {
    setState(prev => ({
      ...prev,
      selectedArticles: prev.selectedArticles.length === prev.articles.length
        ? []
        : prev.articles.map(a => a.id),
    }));
  };

  const handleViewArticle = (article: Article) => {
    setState(prev => ({
      ...prev,
      activeArticle: article,
      drawerOpen: true,
    }));
  };

  const handleCloseDrawer = () => {
    setState(prev => ({
      ...prev,
      drawerOpen: false,
      activeArticle: null,
    }));
  };

  const handleSort = (field: SortField) => {
    setState(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedArticles: [],
    }));
  };

  // Filter and sort articles
  const filteredArticles = state.articles
    .filter(article => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          article.title.toLowerCase().includes(query) ||
          article.keyword.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const order = state.sortOrder === 'asc' ? 1 : -1;
      switch (state.sortBy) {
        case 'title':
          return order * a.title.localeCompare(b.title);
        case 'status':
          return order * a.status.localeCompare(b.status);
        case 'ranking':
          return order * ((a.ranking || 999) - (b.ranking || 999));
        case 'createdAt':
          return order * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'updatedAt':
        default:
          return order * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className={cn(
          "text-sm font-medium",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}>
          {uiLanguage === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Website Selector */}
      <WebsiteSelector
        selectedWebsite={state.selectedWebsite}
        websites={websites}
        onSelectWebsite={handleSelectWebsite}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />

      {/* Main Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                isDarkTheme ? "text-zinc-500" : "text-gray-400"
              )} />
              <input
                type="text"
                placeholder={uiLanguage === 'zh' ? '搜索文章或关键词...' : 'Search articles or keywords...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                  isDarkTheme
                    ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "border-zinc-800 hover:bg-zinc-800"
                  : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              {uiLanguage === 'zh' ? '筛选' : 'Filter'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "border-zinc-800 hover:bg-zinc-800"
                  : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {uiLanguage === 'zh' ? '刷新' : 'Refresh'}
            </Button>
            <Button
              size="sm"
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              {uiLanguage === 'zh' ? '新建文章' : 'New Article'}
            </Button>
          </div>
        </div>

        {/* Article Table */}
        <ArticleTable
          articles={filteredArticles}
          selectedArticles={state.selectedArticles}
          onSelectArticle={handleSelectArticle}
          onSelectAll={handleSelectAll}
          onViewArticle={handleViewArticle}
          sortBy={state.sortBy}
          sortOrder={state.sortOrder}
          onSort={handleSort}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-sm font-medium",
            isDarkTheme ? "text-zinc-500" : "text-gray-500"
          )}>
            {uiLanguage === 'zh'
              ? `显示 1-${filteredArticles.length} / 共 ${filteredArticles.length} 条`
              : `Showing 1-${filteredArticles.length} of ${filteredArticles.length}`}
          </div>
          <div className="flex items-center gap-2">
            {/* Pagination buttons would go here */}
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      <BatchActions
        selectedCount={state.selectedArticles.length}
        onClearSelection={handleClearSelection}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />

      {/* Article Drawer */}
      <ArticleDrawer
        article={state.activeArticle}
        isOpen={state.drawerOpen}
        onClose={handleCloseDrawer}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />
    </div>
  );
};
