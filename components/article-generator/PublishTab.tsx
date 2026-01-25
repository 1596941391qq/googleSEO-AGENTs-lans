import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ExternalLink, 
  Globe, 
  CheckCircle, 
  Loader2,
  Copy,
  Send,
  X,
  Edit3,
  BookOpen,
  Cloud,
  Zap,
  Triangle,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { apiClient } from "../../lib/api-client";
import { RichTextEditor } from "../projects/RichTextEditor";

interface Article {
  id: string;
  title: string;
  keyword: string;
  status: 'draft' | 'published';
  published_at?: string;
  url_slug?: string;
  content: string;
  content_type?: 'informational' | 'commercial';
  websiteId?: string; // 关联的用户网站 ID
  websiteName?: string; // 用户网站域名
  websiteUrl?: string; // 用户网站 URL
  site_name?: string; // 发布站点名称
  site_url?: string; // 发布站点 URL (访问链接)
  platform?: string;
}

interface PublishTabProps {
  isDarkTheme: boolean;
  uiLanguage: 'zh' | 'en';
}

// 平台配置
const PLATFORM_CONFIG: Record<string, { name: string; icon: any; color: string }> = {
  rtd: { name: 'Read the Docs', icon: BookOpen, color: 'text-blue-500' },
  cf_pages: { name: 'Cloudflare Pages', icon: Cloud, color: 'text-orange-500' },
  netlify: { name: 'Netlify', icon: Zap, color: 'text-teal-500' },
  vercel: { name: 'Vercel', icon: Triangle, color: 'text-white' },
};

export function PublishTab({ isDarkTheme, uiLanguage }: PublishTabProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [republishingId, setRepublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/articles/list');
      if (response.success) {
        setArticles(response.data.articles || []);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (articleId: string, websiteId?: string) => {
    try {
      setPublishingId(articleId);

      const response = await apiClient.post('/api/articles/publish', {
        articleId,
        websiteId // 传递关联的用户网站 ID
      });

      if (response.success) {
        // Update local state
        setArticles(prev => prev.map(a =>
          a.id === articleId
            ? {
                ...a,
                status: 'published',
                published_at: response.data.publishedAt,
                url_slug: response.data.liveUrl?.split('/').pop(),
                site_name: response.data.siteName,
                site_url: response.data.liveUrl,
                platform: response.data.platform
              }
            : a
        ));

        // 复制链接到剪贴板
        if (response.data.liveUrl) {
          navigator.clipboard.writeText(response.data.liveUrl);
          setCopiedUrl(response.data.liveUrl);
          setTimeout(() => setCopiedUrl(null), 3000);
        }
      } else {
        alert(response.error || "Publishing failed");
      }
    } catch (error) {
      console.error("Publish error:", error);
      alert("Failed to publish article");
    } finally {
      setPublishingId(null);
    }
  };

  const handleRepublish = async (articleId: string, websiteId?: string) => {
    try {
      setRepublishingId(articleId);

      const response = await apiClient.post('/api/articles/publish', {
        articleId,
        websiteId,
        forceUpdate: true // 标记为强制更新
      });

      if (response.success) {
        // Update local state
        setArticles(prev => prev.map(a =>
          a.id === articleId
            ? {
                ...a,
                published_at: new Date().toISOString(),
                site_url: response.data.liveUrl,
              }
            : a
        ));

        // 显示成功提示
        setCopiedUrl('updated');
        setTimeout(() => setCopiedUrl(null), 3000);
      } else {
        alert(response.error || "Republishing failed");
      }
    } catch (error) {
      console.error("Republish error:", error);
      alert("Failed to republish article");
    } finally {
      setRepublishingId(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // 统计
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const publishedCount = articles.filter(a => a.status === 'published').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className={isDarkTheme ? "text-zinc-400" : "text-zinc-500"}>
          {uiLanguage === 'zh' ? '正在加载文章列表...' : 'Loading articles...'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className={cn(
            "text-3xl font-black tracking-tight",
            isDarkTheme ? "text-white" : "text-zinc-900"
          )}>
            {uiLanguage === 'zh' ? '发布管理' : 'Publish Manager'}
          </h2>
          <p className={cn(
            "text-sm font-medium opacity-60",
            isDarkTheme ? "text-zinc-400" : "text-zinc-600"
          )}>
            {uiLanguage === 'zh' 
              ? '一键发布内容到高信任度平台，系统自动分配最优站点' 
              : 'One-click publish to high-trust platforms, auto-assigned to optimal sites'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchArticles}
          className={cn("rounded-xl", isDarkTheme ? "border-zinc-700" : "")}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {uiLanguage === 'zh' ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn("border-none rounded-2xl", isDarkTheme ? "bg-zinc-900/50" : "bg-white shadow-sm")}>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-amber-500">{draftCount}</div>
            <div className="text-xs font-bold opacity-60">
              {uiLanguage === 'zh' ? '待发布' : 'Drafts'}
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-none rounded-2xl", isDarkTheme ? "bg-zinc-900/50" : "bg-white shadow-sm")}>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-emerald-500">{publishedCount}</div>
            <div className="text-xs font-bold opacity-60">
              {uiLanguage === 'zh' ? '已发布' : 'Published'}
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-none rounded-2xl col-span-2", isDarkTheme ? "bg-zinc-900/50" : "bg-white shadow-sm")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold">
                  {uiLanguage === 'zh' ? '自动化发布' : 'Auto Publishing'}
                </div>
                <div className="text-xs opacity-60">
                  {uiLanguage === 'zh' 
                    ? '系统自动选择最优平台和站点' 
                    : 'System auto-selects optimal platform & site'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Copied Toast */}
      {copiedUrl && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <Card className={cn(
            "border",
            copiedUrl === 'updated'
              ? "border-blue-500 bg-blue-500/10"
              : "border-emerald-500 bg-emerald-500/10"
          )}>
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle className={cn(
                "w-4 h-4",
                copiedUrl === 'updated' ? "text-blue-500" : "text-emerald-500"
              )} />
              <span className={cn(
                "text-sm font-medium",
                copiedUrl === 'updated' ? "text-blue-500" : "text-emerald-500"
              )}>
                {copiedUrl === 'updated'
                  ? (uiLanguage === 'zh' ? '文章已更新!' : 'Article updated!')
                  : (uiLanguage === 'zh' ? '链接已复制!' : 'Link copied!')}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Article List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          <span className="text-xs font-black uppercase tracking-widest opacity-60">
            {uiLanguage === 'zh' ? '文章列表' : 'Articles'}
          </span>
        </div>

        {articles.length === 0 ? (
          <Card className={cn(
            "border-2 border-dashed rounded-[32px]",
            isDarkTheme ? "border-zinc-800 bg-transparent" : "border-zinc-200"
          )}>
            <CardContent className="p-12 text-center space-y-4">
              <FileText className="w-12 h-12 mx-auto text-zinc-500 opacity-20" />
              <div className="space-y-1">
                <p className="font-bold">{uiLanguage === 'zh' ? '暂无内容草稿' : 'No drafts available'}</p>
                <p className="text-sm opacity-60">
                  {uiLanguage === 'zh' ? '先去图文工场生成一些内容吧' : 'Generate content in Content Factory first'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {articles.map((article) => {
              const platformConfig = article.platform ? PLATFORM_CONFIG[article.platform] : null;
              const PlatformIcon = platformConfig?.icon || Globe;
              
              return (
                <Card
                  key={article.id}
                  className={cn(
                    "border-none rounded-3xl overflow-hidden transition-all hover:scale-[1.005] group relative",
                    isDarkTheme ? "bg-zinc-900/50 hover:bg-zinc-900" : "bg-white shadow-sm hover:shadow-md"
                  )}
                >
                  {/* 右上角查看图标 - 仅已发布文章显示 */}
                  {article.status === 'published' && article.site_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                      onClick={() => window.open(article.site_url, '_blank')}
                      title={uiLanguage === 'zh' ? '在新标签页查看' : 'View in new tab'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}

                  <CardContent className="p-6">\n                    <div className="flex items-start justify-between gap-4">\n                      <div className="space-y-3 flex-1 min-w-0 pr-8">{/* 添加右侧padding避免与图标重叠 */}
                        {/* Status & Type Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn(
                            "font-bold",
                            article.status === 'published' 
                              ? "bg-emerald-500 text-white" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {article.status === 'published' 
                              ? (uiLanguage === 'zh' ? '已发布' : 'Published') 
                              : (uiLanguage === 'zh' ? '草稿' : 'Draft')}
                          </Badge>
                          {article.content_type && (
                            <Badge className={cn(
                              "font-bold text-[10px]",
                              article.content_type === 'commercial' 
                                ? "bg-amber-500/10 text-amber-500" 
                                : "bg-blue-500/10 text-blue-500"
                            )}>
                              {article.content_type === 'commercial' 
                                ? (uiLanguage === 'zh' ? '🏷️ 商业型' : '🏷️ Commercial') 
                                : (uiLanguage === 'zh' ? '📚 信息型' : '📚 Informational')}
                            </Badge>
                          )}
                          {/* 关联的用户网站 */}
                          {article.websiteName && (
                            <Badge className="bg-purple-500/10 text-purple-400 font-medium text-[10px]">
                              <Globe className="w-3 h-3 mr-1" />
                              {article.websiteName}
                            </Badge>
                          )}
                          {article.platform && platformConfig && (
                            <Badge className="bg-zinc-500/10 text-zinc-400 font-medium text-[10px]">
                              <PlatformIcon className={cn("w-3 h-3 mr-1", platformConfig.color)} />
                              {platformConfig.name}
                            </Badge>
                          )}
                          <span className="text-xs opacity-40 font-medium">
                            {article.keyword}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className={cn(
                          "text-xl font-black truncate tracking-tight",
                          isDarkTheme ? "text-white" : "text-zinc-900"
                        )}>
                          {article.title}
                        </h3>

                        {/* Published URL */}
                        {article.status === 'published' && article.site_url && (
                          <div className="flex items-center gap-2 text-xs">
                            <Globe className="w-3 h-3 text-emerald-500" />
                            <a 
                              href={article.site_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:underline truncate max-w-md"
                            >
                              {article.site_name || article.site_url}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "rounded-xl font-bold",
                            isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-gray-200"
                          )}
                          onClick={() => setEditingArticle(article)}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          {uiLanguage === 'zh' ? '编辑' : 'Edit'}
                        </Button>

                        {article.status === 'published' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-emerald-500/20 text-emerald-500 font-bold hover:bg-emerald-500/10"
                              onClick={() => article.site_url && copyToClipboard(article.site_url)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              {uiLanguage === 'zh' ? '复制链接' : 'Copy'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={republishingId === article.id}
                              className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-50"
                              onClick={() => handleRepublish(article.id, article.websiteId)}
                            >
                              {republishingId === article.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  {uiLanguage === 'zh' ? '更新中...' : 'Updating...'}
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  {uiLanguage === 'zh' ? '更新' : 'Update'}
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={publishingId === article.id || !article.websiteId}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold disabled:opacity-50"
                            onClick={() => handlePublish(article.id, article.websiteId)}
                            title={!article.websiteId ? (uiLanguage === 'zh' ? '请先关联网站' : 'Please link a website first') : ''}
                          >
                            {publishingId === article.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {uiLanguage === 'zh' ? '发布中...' : 'Publishing...'}
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                {uiLanguage === 'zh' ? '一键发布' : 'Publish'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className={cn(
        "border-none rounded-3xl",
        isDarkTheme ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-blue-500">
                {uiLanguage === 'zh' ? '自动发布说明' : 'Auto-Publishing Info'}
              </h4>
              <ul className="text-sm opacity-70 space-y-1">
                <li>• {uiLanguage === 'zh' 
                  ? '系统会根据内容类型自动选择最优平台（RTD、CF Pages、Netlify 等）' 
                  : 'System auto-selects optimal platform based on content type'}</li>
                <li>• {uiLanguage === 'zh' 
                  ? '首次发布后，同一项目的后续内容会发布到相同站点' 
                  : 'After first publish, subsequent content goes to same site'}</li>
                <li>• {uiLanguage === 'zh' 
                  ? '发布后链接会自动复制到剪贴板' 
                  : 'Published URL is auto-copied to clipboard'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rich Text Editor Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
          <div className={cn(
            "relative w-full max-w-6xl h-full max-h-[90vh] rounded-2xl border overflow-hidden flex flex-col shadow-2xl",
            isDarkTheme ? "bg-[#0a0a0a] border-zinc-800" : "bg-white border-gray-200"
          )}>
            <div className={cn(
              "flex items-center justify-between p-4 border-b",
              isDarkTheme ? "border-zinc-800" : "border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <Badge className={cn(
                  "font-bold",
                  editingArticle.status === 'published' 
                    ? "bg-emerald-500 text-white" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {editingArticle.status === 'published' 
                    ? (uiLanguage === 'zh' ? '已发布' : 'Published') 
                    : (uiLanguage === 'zh' ? '草稿' : 'Draft')}
                </Badge>
                <h2 className={cn("text-lg font-bold truncate max-w-xl", isDarkTheme ? "text-white" : "text-gray-900")}>
                  {editingArticle.title}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingArticle(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RichTextEditor
                initialContent={editingArticle.content}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
                draftId={editingArticle.id}
                onSave={async (newContent) => {
                  try {
                    const response = await apiClient.post('/api/articles/save-draft', {
                      articleId: editingArticle.id,
                      title: editingArticle.title,
                      content: newContent,
                    });
                    if (response.success) {
                      setArticles(prev => prev.map(a => 
                        a.id === editingArticle.id 
                          ? { ...a, content: newContent } 
                          : a
                      ));
                      setEditingArticle(null);
                    } else {
                      alert(response.error || (uiLanguage === 'zh' ? '保存失败' : 'Failed to save'));
                    }
                  } catch (err) {
                    console.error('Error saving draft:', err);
                    alert(uiLanguage === 'zh' ? '保存失败' : 'Failed to save draft');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
