/**
 * Website Articles Manager - Type Definitions
 * 网站文章管理系统的类型定义
 */

export type ArticleStatus = 'draft' | 'generating' | 'published' | 'ranking' | 'failed';
export type PublishPlatform = 'rtd' | 'github' | 'gitlab' | 'cloudflare' | 'netlify' | 'vercel' | 'none';
export type URLPathType = '/lab/' | '/guide/' | '/tool/' | '/compare/' | '/live/';
export type SearchIntent = 'informational' | 'commercial';

export interface Website {
  id: string;
  domain: string;
  url: string;
  totalArticles: number;
  publishedCount: number;
  rankingCount: number;
  createdAt: string;
}

export interface Article {
  id: string;
  websiteId: string;
  title: string;
  keyword: string;
  intent: SearchIntent;
  urlPath: URLPathType | string;
  platform: PublishPlatform;
  status: ArticleStatus;
  ranking?: number;
  traffic?: number;
  content?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ArticleFilters {
  status?: ArticleStatus[];
  platform?: PublishPlatform[];
  urlPath?: URLPathType[];
  intent?: SearchIntent[];
  searchQuery?: string;
}

export type SortField = 'createdAt' | 'updatedAt' | 'status' | 'ranking' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface WebsiteArticlesState {
  selectedWebsite: Website | null;
  articles: Article[];
  selectedArticles: string[];
  filters: ArticleFilters;
  sortBy: SortField;
  sortOrder: SortOrder;
  drawerOpen: boolean;
  activeArticle: Article | null;
}
