import React, { useState, useEffect } from "react";
import { 
  FileText, 
  ExternalLink, 
  Globe, 
  Settings, 
  ChevronRight, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Copy,
  Layout,
  Type
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { cn } from "../../lib/utils";
import { apiClient } from "../../lib/api-client";

interface Article {
  id: string;
  title: string;
  keyword: string;
  status: 'draft' | 'published';
  published_at?: string;
  url_slug?: string;
  content: string;
}

interface PublishTabProps {
  isDarkTheme: boolean;
  uiLanguage: 'zh' | 'en';
}

export function PublishTab({ isDarkTheme, uiLanguage }: PublishTabProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [platform, setPlatform] = useState<'platform' | 'wordpress' | 'medium'>('platform');
  const [config, setConfig] = useState({
    wpUrl: '',
    wpUsername: '',
    wpPassword: '',
    mediumToken: ''
  });

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

  const handlePublish = async (articleId: string) => {
    try {
      setPublishingId(articleId);
      const response = await apiClient.post('/api/articles/publish', {
        articleId,
        platform,
        config: platform === 'platform' ? {} : config
      });

      if (response.success) {
        // Update local state
        setArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, status: 'published', published_at: response.data.publishedAt, url_slug: response.data.urlSlug } 
            : a
        ));
        
        if (response.data.liveUrl) {
          window.open(response.data.liveUrl, '_blank');
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className={cn(
            "text-3xl font-black tracking-tight",
            isDarkTheme ? "text-white" : "text-zinc-900"
          )}>
            {uiLanguage === 'zh' ? '内容发布中心' : 'Content Publishing'}
          </h2>
          <p className={cn(
            "text-sm font-medium opacity-60",
            isDarkTheme ? "text-zinc-400" : "text-zinc-600"
          )}>
            {uiLanguage === 'zh' 
              ? '一键分发内容到您的 PSEO 站、WordPress 或 Medium' 
              : 'One-click distribute content to your PSEO site, WordPress or Medium'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Settings */}
        <div className="space-y-6">
          <Card className={cn(
            "border-none rounded-[32px] overflow-hidden",
            isDarkTheme ? "bg-zinc-900/50" : "bg-white shadow-sm"
          )}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-lg font-bold">
                  {uiLanguage === 'zh' ? '发布配置' : 'Publishing Config'}
                </CardTitle>
              </div>
              <CardDescription>
                {uiLanguage === 'zh' ? '选择目标平台并配置 API 信息' : 'Select target platform and configure API'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">
                  {uiLanguage === 'zh' ? '目标平台' : 'Target Platform'}
                </label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger className="rounded-2xl border-2 font-bold bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkTheme ? "bg-zinc-900" : "bg-white"}>
                    <SelectItem value="platform">
                      <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        <span>{uiLanguage === 'zh' ? '平台托管站 (PSEO)' : 'Platform Hosted (PSEO)'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="wordpress">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>WordPress</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        <span>Medium</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {platform === 'wordpress' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-60">Site URL</label>
                    <Input 
                      placeholder="https://example.com" 
                      value={config.wpUrl} 
                      onChange={e => setConfig({...config, wpUrl: e.target.value})}
                      className="rounded-xl border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-60">Username</label>
                    <Input 
                      placeholder="admin" 
                      value={config.wpUsername} 
                      onChange={e => setConfig({...config, wpUsername: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-60">Application Password</label>
                    <Input 
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx" 
                      value={config.wpPassword} 
                      onChange={e => setConfig({...config, wpPassword: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}

              {platform === 'medium' && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-60">Integration Token</label>
                    <Input 
                      type="password"
                      placeholder="Enter Medium API token" 
                      value={config.mediumToken} 
                      onChange={e => setConfig({...config, mediumToken: e.target.value})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}

              {platform === 'platform' && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      {uiLanguage === 'zh' ? '平台代管模式已就绪' : 'Platform Managed Mode Ready'}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-60 font-medium">
                    {uiLanguage === 'zh' 
                      ? '文章将自动部署到您的子域名，并通过 Google Indexing API 秒级推送索引。' 
                      : 'Articles will be automatically deployed to your subdomain and indexed via Google Indexing API in seconds.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Article List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest opacity-60">
              {uiLanguage === 'zh' ? '待发布文章' : 'Pending Articles'}
            </span>
          </div>

          {articles.length === 0 ? (
            <div className={cn(
              "p-12 text-center border-2 border-dashed rounded-[32px] space-y-4",
              isDarkTheme ? "border-zinc-800" : "border-zinc-200"
            )}>
              <FileText className="w-12 h-12 mx-auto text-zinc-500 opacity-20" />
              <div className="space-y-1">
                <p className="font-bold">{uiLanguage === 'zh' ? '暂无内容草稿' : 'No drafts available'}</p>
                <p className="text-sm opacity-60">
                  {uiLanguage === 'zh' ? '先去图文工场生成一些惊人的内容吧' : 'Go to Content Factory to generate some amazing content first'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {articles.map((article) => (
                <Card 
                  key={article.id} 
                  className={cn(
                    "border-none rounded-3xl overflow-hidden transition-all hover:scale-[1.01] group",
                    isDarkTheme ? "bg-zinc-900/50 hover:bg-zinc-900" : "bg-white shadow-sm hover:shadow-md"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
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
                          <span className="text-xs opacity-40 font-medium">
                            {article.keyword}
                          </span>
                        </div>
                        <h3 className={cn(
                          "text-xl font-black truncate tracking-tight",
                          isDarkTheme ? "text-white" : "text-zinc-900"
                        )}>
                          {article.title}
                        </h3>
                        {article.status === 'published' && article.url_slug && (
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                            <Globe className="w-3 h-3" />
                            <span>/{article.url_slug}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {article.status === 'published' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="rounded-xl border-emerald-500/20 text-emerald-500 font-bold"
                            onClick={() => {
                              const baseDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'seo-factory.com';
                              // This is a placeholder for the actual live URL
                              window.open(`#`, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {uiLanguage === 'zh' ? '查看' : 'View'}
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            disabled={publishingId === article.id}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                            onClick={() => handlePublish(article.id)}
                          >
                            {publishingId === article.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            {uiLanguage === 'zh' ? '立即发布' : 'Publish'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
