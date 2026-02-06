import React, { useState, useEffect } from 'react';
import {
  Key,
  Globe,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  RefreshCw,
  LogOut,
  Server,
  BookOpen,
  Cloud,
  Zap,
  Triangle,
  Github,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Link2,
  Send
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

interface GitHubToken {
  id: string;
  name: string;
  owner_name: string;
  usage_count: number;
  status: string;
  token_preview: string;
  created_at: string;
}

interface PlatformToken {
  id: string;
  platform: string;
  name: string;
  usage_count: number;
  status: string;
  token_preview: string;
  created_at: string;
  metadata?: {
    installation_id?: string;
  } | null;
}

interface PlatformSite {
  id: string;
  github_token_id: string;
  platform_token_id: string | null;
  platform: string;
  content_type: string;
  site_name: string;
  site_url: string;
  repo_name: string;
  docs_path: string | null;
  branch: string | null;
  usage_count: number;
  status: string;
  github_token_name?: string;
  github_owner?: string;
  platform_token_name?: string | null;
  created_at: string;
}

interface Stats {
  totalGitHubTokens: number;
  activeGitHubTokens: number;
  totalPlatformTokens: number;
  activePlatformTokens: number;
  totalSites: number;
  activeSites: number;
  pendingSites: number;
  totalBindings: number;
  platformBreakdown: { platform: string; count: number }[];
  contentTypeBreakdown: { content_type: string; count: number }[];
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

const PLATFORM_CONFIG = {
  netlify: { name: 'Netlify', icon: Zap, color: 'text-teal-500', bg: 'bg-teal-500/10' },
};

const CONTENT_TYPE_CONFIG = {
  informational: { label: '📚 Informational', color: 'bg-blue-500' },
  commercial: { label: '🏷️ Commercial', color: 'bg-amber-500' },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Pending' },
  active: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/20', label: 'Active' },
  disabled: { icon: AlertCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/20', label: 'Disabled' },
};

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [githubTokens, setGitHubTokens] = useState<GitHubToken[]>([]);
  const [platformTokens, setPlatformTokens] = useState<PlatformToken[]>([]);
  const [tokenBindings, setTokenBindings] = useState<{
    bound: Array<{ github: GitHubToken; platform: PlatformToken }>;
    unboundGithub: GitHubToken[];
    unboundPlatform: PlatformToken[];
  }>({ bound: [], unboundGithub: [], unboundPlatform: [] });
  const [sites, setSites] = useState<PlatformSite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'github' | 'platform' | 'sites' | 'published'>('github');
  const [showHelp, setShowHelp] = useState(false);

  // 已发布文章状态
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [bindingArticleId, setBindingArticleId] = useState<string | null>(null);
  const [bindingRepoName, setBindingRepoName] = useState('');
  const [pushingArticleId, setPushingArticleId] = useState<string | null>(null);

  // Platform Token Installation ID 编辑状态
  const [editingPlatformTokenId, setEditingPlatformTokenId] = useState<string | null>(null);
  const [editInstallationId, setEditInstallationId] = useState('');

  // 调试日志
  useEffect(() => {
    console.log('[AdminDashboard] State:', {
      activeTab,
      githubTokensCount: githubTokens.length,
      platformTokensCount: platformTokens.length,
      loading
    });
  }, [activeTab, githubTokens, platformTokens, loading]);

  // 新建 GitHub Token 表单
  const [showAddGitHubToken, setShowAddGitHubToken] = useState(false);
  const [newGitHubToken, setNewGitHubToken] = useState({
    name: '',
    token: '',
    owner_name: ''
  });

  // 新建平台 Token 表单
  const [showAddPlatformToken, setShowAddPlatformToken] = useState(false);
  const [newPlatformToken, setNewPlatformToken] = useState({
    platform: 'netlify',
    name: '',
    token: ''
  });

  // 新建站点表单
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSite, setNewSite] = useState({
    github_token_id: '',
    platform_token_id: '',
    platform: 'netlify',
    content_type: 'informational',
    site_name: '',
    repo_name: '',
    docs_path: 'docs',
    branch: 'main'
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tokensRes, sitesRes, publishedRes] = await Promise.all([
        fetch('/api/admin/tokens', { headers }),
        fetch('/api/admin/sites', { headers }),
        fetch('/api/admin/published', { headers })
      ]);

      const tokensData = await tokensRes.json();
      const sitesData = await sitesRes.json();
      const publishedData = await publishedRes.json();

      console.log('[AdminDashboard] API Response:', tokensData);

      if (tokensData.success) {
        // 新 API 格式：{ bound, unboundGithub, unboundPlatform }
        if (tokensData.data.unboundGithub !== undefined) {
          // 使用绑定关系格式
          setTokenBindings({
            bound: tokensData.data.bound || [],
            unboundGithub: tokensData.data.unboundGithub || [],
            unboundPlatform: tokensData.data.unboundPlatform || []
          });

          // 为了兼容现有代码，也设置原始数组
          const allGithubTokens = [
            ...tokensData.data.unboundGithub,
            ...(tokensData.data.bound || []).map((b: any) => b.github)
          ];
          setGitHubTokens(allGithubTokens);

          const allPlatformTokens = [
            ...tokensData.data.unboundPlatform,
            ...(tokensData.data.bound || []).map((b: any) => b.platform)
          ];
          setPlatformTokens(allPlatformTokens);

          setStats({
            totalGitHubTokens: allGithubTokens.length,
            activeGitHubTokens: allGithubTokens.filter((t: any) => t.status === 'active').length,
            totalPlatformTokens: allPlatformTokens.length,
            activePlatformTokens: allPlatformTokens.filter((t: any) => t.status === 'active').length,
            totalSites: 0,
            activeSites: 0,
            pendingSites: 0,
            totalBindings: (tokensData.data.bound || []).length,
            platformBreakdown: [],
            contentTypeBreakdown: []
          });
        } else {
          // 旧格式（向后兼容）
          setGitHubTokens(tokensData.data.githubTokens || []);
          setPlatformTokens(tokensData.data.platformTokens || []);
          setStats(tokensData.data.stats || null);
        }
      }
      if (sitesData.success) {
        setSites(sitesData.data.sites || []);
      }

      // 加载已发布文章
      if (publishedData.success) {
        const articles = publishedData.data.articles || [];
        console.log('[AdminDashboard] Loaded published articles:', articles.length);
        console.log('[AdminDashboard] Published data:', publishedData.data);
        setPublishedArticles(articles);
      } else {
        console.error('[AdminDashboard] Failed to load published articles:', publishedData.error);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // GitHub Token 操作
  const handleAddGitHubToken = async () => {
    try {
      const res = await fetch('/api/admin/tokens?type=github', {
        method: 'POST',
        headers,
        body: JSON.stringify(newGitHubToken)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddGitHubToken(false);
        setNewGitHubToken({ name: '', token: '', owner_name: '' });
        fetchData();
      } else {
        alert(data.error || 'Failed to add GitHub token');
      }
    } catch (error) {
      alert('Failed to add GitHub token');
    }
  };

  const handleToggleGitHubTokenStatus = async (tokenId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch('/api/admin/tokens?type=github', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tokenId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to update token');
    }
  };

  const handleDeleteGitHubToken = async (tokenId: string) => {
    if (!confirm('Delete this GitHub token? All associated sites will also be deleted.')) return;
    try {
      const res = await fetch('/api/admin/tokens?type=github', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ tokenId })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to delete token');
    }
  };

  // Platform Token 操作
  const handleAddPlatformToken = async () => {
    try {
      const res = await fetch('/api/admin/tokens?type=platform', {
        method: 'POST',
        headers,
        body: JSON.stringify(newPlatformToken)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddPlatformToken(false);
        setNewPlatformToken({ platform: 'netlify', name: '', token: '' });
        fetchData();
      } else {
        alert(data.error || 'Failed to add platform token');
      }
    } catch (error) {
      alert('Failed to add platform token');
    }
  };

  const handleTogglePlatformTokenStatus = async (tokenId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch('/api/admin/tokens?type=platform', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tokenId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to update token');
    }
  };

  const handleDeletePlatformToken = async (tokenId: string) => {
    if (!confirm('Delete this platform token?')) return;
    try {
      const res = await fetch('/api/admin/tokens?type=platform', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ tokenId })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to delete token');
    }
  };

  // 编辑 Platform Token Installation ID（仅 Netlify）
  const handleEditPlatformInstallation = (token: PlatformToken) => {
    setEditingPlatformTokenId(token.id);
    setEditInstallationId(token.metadata?.installation_id || '');
  };

  const handleUpdatePlatformInstallation = async () => {
    if (!editingPlatformTokenId) return;

    try {
      const res = await fetch('/api/admin/tokens?type=platform', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          tokenId: editingPlatformTokenId,
          installation_id: editInstallationId || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingPlatformTokenId(null);
        setEditInstallationId('');
        // 重新加载最新数据以在 UI 中展示 "✓ Installation ID: xxx"
        fetchData();
        // 明确提示保存成功，方便确认
        alert('Installation ID 已保存');
      } else {
        alert(data.error || 'Installation ID 保存失败');
      }
    } catch (error) {
      alert('Installation ID 保存失败');
    }
  };

  // 绑定/解绑操作
  const handleBindTokens = async (githubTokenId: string, platformTokenId: string, platform: string) => {
    try {
      const res = await fetch('/api/admin/tokens?action=bind', {
        method: 'POST',
        headers,
        body: JSON.stringify({ githubTokenId, platformTokenId, platform })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to bind tokens');
      }
    } catch (error) {
      alert('Failed to bind tokens');
    }
  };

  const handleUnbindTokens = async (githubTokenId: string, platformTokenId: string) => {
    if (!confirm('Unbind these tokens?')) return;
    try {
      const res = await fetch('/api/admin/tokens?action=unbind', {
        method: 'POST',
        headers,
        body: JSON.stringify({ githubTokenId, platformTokenId })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to unbind tokens');
      }
    } catch (error) {
      alert('Failed to unbind tokens');
    }
  };

  // Site 操作
  const handleAddSite = async () => {
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers,
        body: JSON.stringify(newSite)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSite(false);
        setNewSite({
          github_token_id: '',
          platform_token_id: '',
          platform: 'rtd',
          content_type: 'informational',
          site_name: '',
          repo_name: '',
          docs_path: 'docs',
          branch: 'main'
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to add site');
      }
    } catch (error) {
      alert('Failed to add site');
    }
  };

  const handleToggleSiteStatus = async (siteId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ siteId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to update site');
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Delete this site?')) return;
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ siteId })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      alert('Failed to delete site');
    }
  };

  // 手动绑定文章到仓库
  const handleBindArticleToRepo = async (articleId: string) => {
    if (!bindingRepoName.trim()) {
      alert('Please enter a repository name');
      return;
    }

    try {
      const res = await fetch('/api/admin/bind-article', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          articleId,
          repoName: bindingRepoName.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setBindingArticleId(null);
        setBindingRepoName('');
        // 刷新数据
        fetchData();
        alert('Article bound successfully!');
      } else {
        alert(data.error || 'Failed to bind article');
      }
    } catch (error) {
      alert('Failed to bind article');
    }
  };

  // 推送文章到 unifuncs
  const handlePushToUnifuncs = async (articleId: string) => {
    setPushingArticleId(articleId);

    try {
      const res = await fetch('/api/admin/push-to-unifuncs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ articleId })
      });

      const data = await res.json();
      if (data.success) {
        const result = data.results?.[0];
        if (result?.success) {
          alert(`✅ Successfully pushed to unifuncs!\n${result.shareUrl ? `\nShare URL: ${result.shareUrl}` : ''}`);
        } else {
          alert(`❌ Failed to push: ${result?.error || 'Unknown error'}`);
        }
      } else {
        alert(`❌ ${data.message || 'Failed to push to unifuncs'}`);
      }
    } catch (error) {
      console.error('[AdminDashboard] Push error:', error);
      alert('❌ Failed to push to unifuncs');
    } finally {
      setPushingArticleId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="font-black text-lg">PSEO Admin</h1>
              <p className="text-xs text-zinc-500">Publishing Pool Management v2</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="rounded-xl border-zinc-700"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="rounded-xl border-zinc-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="rounded-xl border-zinc-700 text-red-400 hover:text-red-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-emerald-500">{stats.totalGitHubTokens}</div>
                <div className="text-[10px] text-zinc-500 font-bold">GitHub Tokens</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-emerald-500">{stats.activeGitHubTokens}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Active GitHub</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-blue-500">{stats.totalPlatformTokens}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Platform Tokens</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-blue-500">{stats.activePlatformTokens}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Active Platform</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-purple-500">{stats.totalSites}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Total Sites</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-purple-500">{stats.activeSites}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Active Sites</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-yellow-500">{stats.pendingSites}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Pending Sites</div>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-amber-500">{stats.totalBindings}</div>
                <div className="text-[10px] text-zinc-500 font-bold">Bindings</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-4">
          <Button
            variant={activeTab === 'github' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('github')}
            className={cn("rounded-xl", activeTab === 'github' && "bg-emerald-500")}
          >
            <Github className="w-4 h-4 mr-2" />
            GitHub Tokens ({githubTokens.length})
          </Button>
          <Button
            variant={activeTab === 'platform' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('platform')}
            className={cn("rounded-xl", activeTab === 'platform' && "bg-blue-500")}
          >
            <Key className="w-4 h-4 mr-2" />
            Platform Tokens ({platformTokens.length})
          </Button>
          <Button
            variant={activeTab === 'sites' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sites')}
            className={cn("rounded-xl", activeTab === 'sites' && "bg-purple-500")}
          >
            <Globe className="w-4 h-4 mr-2" />
            Sites ({sites.length})
          </Button>
          <Button
            variant={activeTab === 'published' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('published')}
            className={cn("rounded-xl", activeTab === 'published' && "bg-orange-500")}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Published Articles
          </Button>
        </div>

        {/* GitHub Tokens Tab */}
        {activeTab === 'github' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-black">GitHub Token Pool</h2>
              </div>
              <Button
                onClick={() => setShowAddGitHubToken(!showAddGitHubToken)}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add GitHub Token
              </Button>
            </div>

            {showAddGitHubToken && (
              <Card className="border-zinc-800 bg-zinc-900/50 border-emerald-500/50">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">Token Name</label>
                      <Input
                        value={newGitHubToken.name}
                        onChange={(e) => setNewGitHubToken({ ...newGitHubToken, name: e.target.value })}
                        placeholder="e.g., GitHub Bot 1"
                        className="rounded-xl bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">Owner Name (user/org)</label>
                      <Input
                        value={newGitHubToken.owner_name}
                        onChange={(e) => setNewGitHubToken({ ...newGitHubToken, owner_name: e.target.value })}
                        placeholder="e.g., my-org"
                        className="rounded-xl bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">GitHub Token (PAT)</label>
                      <Input
                        type="password"
                        value={newGitHubToken.token}
                        onChange={(e) => setNewGitHubToken({ ...newGitHubToken, token: e.target.value })}
                        placeholder="ghp_xxxx"
                        className="rounded-xl bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddGitHubToken(false)}
                      className="rounded-xl border-zinc-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddGitHubToken}
                      disabled={!newGitHubToken.name || !newGitHubToken.token || !newGitHubToken.owner_name}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    >
                      Add Token
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {githubTokens.length === 0 ? (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-12 text-center">
                    <Github className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500">No GitHub tokens configured yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Add your first GitHub token to start creating repositories</p>
                  </CardContent>
                </Card>
              ) : (
                githubTokens.map((t) => {
                  // 检查是否已绑定
                  const binding = tokenBindings.bound.find(b => b.github.id === t.id);
                  const isBound = !!binding;

                  return (
                    <Card key={t.id} className={cn(
                      "border-zinc-800 bg-zinc-900/50",
                      isBound && "border-teal-500/50 bg-teal-500/5"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                              <Github className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{t.name}</span>
                                <Badge className="text-[10px] bg-zinc-700">@{t.owner_name}</Badge>
                                <Badge className={cn(
                                  "text-[10px]",
                                  t.status === 'active' ? "bg-emerald-500" : "bg-zinc-600"
                                )}>
                                  {t.status}
                                </Badge>
                                {isBound && (
                                  <Badge className="text-[10px] bg-teal-500">
                                    ✓ Bound to {binding.platform.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                <span>Token: {t.token_preview}</span>
                                <span>•</span>
                                <span>Used: {t.usage_count}x</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleGitHubTokenStatus(t.id, t.status)}
                              className="rounded-xl"
                            >
                              {t.status === 'active' ? (
                                <PowerOff className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Power className="w-4 h-4 text-emerald-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGitHubToken(t.id)}
                              className="rounded-xl text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 绑定状态 */}
                        {isBound ? (
                          <div className="mt-3 p-3 rounded-lg bg-teal-500/10 border border-teal-500/30">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-teal-500" />
                                  <span className="text-sm font-medium">Bound to: {binding.platform.name}</span>
                                  <Badge variant="outline" className="text-xs border-teal-500/50 text-teal-400">
                                    {binding.platform.platform}
                                  </Badge>
                                </div>
                                {binding.platform.metadata?.installation_id && (
                                  <div className="text-xs text-emerald-400 font-medium">
                                    ✓ Installation ID: {binding.platform.metadata.installation_id}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {binding.platform.platform === 'netlify' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPlatformInstallation(binding.platform)}
                                    className="h-7 px-3 text-xs rounded-lg border-teal-500/60 text-teal-400 hover:bg-teal-500/10"
                                  >
                                    编辑
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnbindTokens(t.id, binding.platform.id)}
                                  className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                                >
                                  Unbind
                                </Button>
                              </div>
                            </div>
                            {editingPlatformTokenId === binding.platform.id && (
                              <div className="mt-3 border-t border-teal-500/30 pt-3 space-y-2">
                                <label className="text-xs font-bold text-zinc-400 block">
                                  GitHub App Installation ID (可选)
                                </label>
                                <Input
                                  placeholder="输入 Installation ID"
                                  value={editInstallationId}
                                  onChange={(e) => setEditInstallationId(e.target.value)}
                                  className="rounded-xl bg-zinc-900 border-zinc-700 text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleUpdatePlatformInstallation}
                                    className="h-8 px-3 text-xs bg-teal-500 hover:bg-teal-600"
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingPlatformTokenId(null);
                                      setEditInstallationId('');
                                    }}
                                    className="h-8 px-3 text-xs rounded-lg border-zinc-700"
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3">
                            {tokenBindings.unboundPlatform.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Bind to:</span>
                                <select
                                  className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const [platformTokenId, platform] = e.target.value.split(':');
                                      handleBindTokens(t.id, platformTokenId, platform);
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="">Select Platform Token...</option>
                                  {tokenBindings.unboundPlatform.map(p => (
                                    <option key={p.id} value={`${p.id}:${p.platform}`}>
                                      {p.name} ({p.platform})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-600 italic">
                                No Platform Tokens available. Create one first.
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Platform Tokens Tab */}
        {activeTab === 'platform' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-black">Platform Token Pool</h2>
              </div>
              <Button
                onClick={() => setShowAddPlatformToken(!showAddPlatformToken)}
                className="rounded-xl bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Platform Token
              </Button>
            </div>

            {showAddPlatformToken && (
              <Card className="border-zinc-800 bg-zinc-900/50 border-blue-500/50">
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">Platform</label>
                      <Select
                        value={newPlatformToken.platform}
                        onValueChange={(v) => setNewPlatformToken({ ...newPlatformToken, platform: v })}
                      >
                        <SelectTrigger className="rounded-xl bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          {Object.entries(PLATFORM_CONFIG)
                            .map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className={cn("w-4 h-4", config.color)} />
                                {config.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">Token Name</label>
                      <Input
                        value={newPlatformToken.name}
                        onChange={(e) => setNewPlatformToken({ ...newPlatformToken, name: e.target.value })}
                        placeholder="e.g., RTD Bot 1"
                        className="rounded-xl bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400">API Token</label>
                      <Input
                        type="password"
                        value={newPlatformToken.token}
                        onChange={(e) => setNewPlatformToken({ ...newPlatformToken, token: e.target.value })}
                        placeholder="Platform API token"
                        className="rounded-xl bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddPlatformToken(false)}
                      className="rounded-xl border-zinc-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddPlatformToken}
                      disabled={!newPlatformToken.name || !newPlatformToken.token}
                      className="rounded-xl bg-blue-500 hover:bg-blue-600"
                    >
                      Add Token
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {platformTokens.length === 0 ? (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-12 text-center">
                    <Key className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500">No platform tokens configured yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Add platform tokens (RTD, CF Pages, Netlify, Vercel)</p>
                  </CardContent>
                </Card>
              ) : (
                platformTokens.map((t) => {
                  const platformConfig = PLATFORM_CONFIG[t.platform as keyof typeof PLATFORM_CONFIG];
                  const isEditing = editingPlatformTokenId === t.id;
                  const hasInstallation = t.metadata?.installation_id;
                  return (
                    <Card key={t.id} className="border-zinc-800 bg-zinc-900/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", platformConfig?.bg)}>
                              {platformConfig && <platformConfig.icon className={cn("w-5 h-5", platformConfig.color)} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{t.name}</span>
                                <Badge className={cn(
                                  "text-[10px]",
                                  t.status === 'active' ? "bg-emerald-500" : "bg-zinc-600"
                                )}>
                                  {t.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                <span>{platformConfig?.name}</span>
                                <span>•</span>
                                <span>Token: {t.token_preview}</span>
                                <span>•</span>
                                <span>Used: {t.usage_count}x</span>
                              </div>
                              {hasInstallation && (
                                <div className="text-xs text-emerald-400 mt-1">
                                  ✓ Installation ID: {t.metadata!.installation_id}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.platform === 'netlify' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPlatformInstallation(t)}
                                className="rounded-xl border-teal-500/60 text-teal-400 hover:bg-teal-500/10 text-xs h-8 px-3"
                              >
                                编辑
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePlatformTokenStatus(t.id, t.status)}
                              className="rounded-xl"
                            >
                              {t.status === 'active' ? (
                                <PowerOff className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Power className="w-4 h-4 text-emerald-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlatformToken(t.id)}
                              className="rounded-xl text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isEditing && t.platform === 'netlify' && (
                          <div className="border-t border-zinc-800 pt-3 space-y-2">
                            <label className="text-xs font-bold text-zinc-400 block">
                              GitHub App Installation ID (可选)
                            </label>
                            <Input
                              placeholder="输入 Installation ID"
                              value={editInstallationId}
                              onChange={(e) => setEditInstallationId(e.target.value)}
                              className="rounded-xl bg-zinc-900 border-zinc-700 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={handleUpdatePlatformInstallation}
                                className="h-8 px-3 text-xs bg-teal-500 hover:bg-teal-600"
                              >
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPlatformTokenId(null);
                                  setEditInstallationId('');
                                }}
                                className="h-8 px-3 text-xs rounded-lg border-zinc-700"
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Sites Tab */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-black">Publishing Sites</h2>
              </div>
              <div className="text-xs text-zinc-500">
                Sites are auto-created when users publish content
              </div>
            </div>

            <div className="space-y-3">
              {sites.length === 0 ? (
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-12 text-center">
                    <Globe className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500">No sites configured yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Sites will be auto-created when publishing or manually added here</p>
                  </CardContent>
                </Card>
              ) : (
                sites.map((site) => {
                  const platformConfig = PLATFORM_CONFIG[site.platform as keyof typeof PLATFORM_CONFIG];
                  const contentConfig = CONTENT_TYPE_CONFIG[site.content_type as keyof typeof CONTENT_TYPE_CONFIG];
                  const statusConfig = STATUS_CONFIG[site.status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig?.icon || AlertCircle;
                  
                  return (
                    <Card key={site.id} className="border-zinc-800 bg-zinc-900/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", platformConfig?.bg)}>
                            {platformConfig && <platformConfig.icon className={cn("w-5 h-5", platformConfig.color)} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{site.site_name}</span>
                              <Badge className={cn("text-[10px]", contentConfig?.color, "text-white")}>
                                {contentConfig?.label}
                              </Badge>
                              <Badge className={cn("text-[10px]", statusConfig?.bg, statusConfig?.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig?.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                              <span>{platformConfig?.name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Github className="w-3 h-3" />
                                {site.github_owner}/{site.repo_name}
                              </span>
                              {site.site_url && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={site.site_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-400 flex items-center gap-1"
                                  >
                                    {site.site_url}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              )}
                              <span>•</span>
                              <span>Used: {site.usage_count}x</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSiteStatus(site.id, site.status)}
                            className="rounded-xl"
                          >
                            {site.status === 'active' ? (
                              <PowerOff className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Power className="w-4 h-4 text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSite(site.id)}
                            className="rounded-xl text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-auto border-zinc-800 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">PSEO 发布系统说明</CardTitle>
                <CardDescription>Publishing System Architecture & Strategy</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(false)}
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 架构说明 */}
              <div className="space-y-3">
                <h3 className="font-bold text-emerald-500">📦 Token 架构</h3>
                <div className="text-sm text-zinc-300 space-y-2">
                  <p><strong>GitHub Tokens:</strong> 用于创建和管理 GitHub 仓库，推送代码。一个 GitHub Token 可以管理多个仓库/站点。</p>
                  <p><strong>Platform Tokens:</strong> 各发布平台的 API Token（RTD/CF Pages/Netlify/Vercel），用于创建平台项目并连接 GitHub 仓库。</p>
                </div>
              </div>

              {/* 发布策略 */}
              <div className="space-y-3">
                <h3 className="font-bold text-blue-500">🎯 发布策略</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <div className="font-bold text-blue-400 mb-2">📚 信息型内容</div>
                    <ul className="text-sm text-zinc-400 space-y-1">
                      <li>• Read the Docs (RTD)</li>
                      <li>• Cloudflare Pages</li>
                    </ul>
                    <p className="text-xs text-zinc-500 mt-2">适合教程、指南、文档类内容</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="font-bold text-amber-400 mb-2">🏷️ 商业型内容</div>
                    <ul className="text-sm text-zinc-400 space-y-1">
                      <li>• Netlify</li>
                      <li>• Vercel</li>
                      <li>• Cloudflare Pages</li>
                    </ul>
                    <p className="text-xs text-zinc-500 mt-2">适合产品页面、对比评测等</p>
                  </div>
                </div>
              </div>

              {/* 自动创建流程 */}
              <div className="space-y-3">
                <h3 className="font-bold text-purple-500">⚙️ 自动发布流程</h3>
                <div className="text-sm text-zinc-300 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">1</span>
                    <p>用户点击发布 → 系统根据内容类型（信息型/商业型）选择平台</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">2</span>
                    <p>首次发布时，系统自动创建 GitHub 仓库（pseo-site-{'{uuid}'}）并推送 MkDocs 模板</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">3</span>
                    <p>通过平台 API 创建项目并连接 GitHub 仓库</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">4</span>
                    <p>后续发布自动将文章推送到 GitHub，触发平台重新构建</p>
                  </div>
                </div>
              </div>

              {/* 站点状态 */}
              <div className="space-y-3">
                <h3 className="font-bold text-zinc-300">📊 站点状态说明</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-yellow-400 text-sm">Pending</span>
                    </div>
                    <p className="text-xs text-zinc-500">等待创建 GitHub 仓库和平台项目</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-emerald-400 text-sm">Active</span>
                    </div>
                    <p className="text-xs text-zinc-500">站点已创建，可正常发布</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-500/10 border border-zinc-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-zinc-500" />
                      <span className="font-medium text-zinc-400 text-sm">Disabled</span>
                    </div>
                    <p className="text-xs text-zinc-500">站点已禁用，不参与自动分配</p>
                  </div>
                </div>
              </div>

              {/* 分配策略 */}
              <div className="space-y-3">
                <h3 className="font-bold text-zinc-300">🔄 分配策略</h3>
                <div className="text-sm text-zinc-400 p-4 rounded-xl bg-zinc-800/50">
                  <p>系统采用 <strong className="text-emerald-400">最少使用优先</strong> 策略:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• 优先使用使用次数最少的站点/Token</li>
                    <li>• 同一项目的同一内容类型只绑定一个站点</li>
                    <li>• 一个项目最多有 2 个导流站点（信息型 + 商业型各一个）</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Published Articles Tab */}
      {activeTab === 'published' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-black">Published Articles</h2>
            </div>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                  <span className="ml-3 text-zinc-500">Loading articles...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {publishedArticles.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                      <p className="text-zinc-500">No published articles yet</p>
                    </div>
                  ) : (
                    publishedArticles.map((article) => (
                      <div
                        key={article.id}
                        className={cn(
                          "border rounded-lg p-4 hover:bg-zinc-800/50",
                          article.site_id ? "border-zinc-800" : "border-amber-500/50"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{article.title}</span>
                              {article.site_id && article.github_owner ? (
                                <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  ✓ {article.github_owner}/{article.repo_name}
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  ⚠️ Not Bound
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-zinc-400 space-y-1">
                              <p>Keyword: <span className="text-zinc-300">{article.keyword || 'N/A'}</span></p>
                              <p>Published: {article.published_at ? new Date(article.published_at).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {article.site_id ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePushToUnifuncs(article.id)}
                                  disabled={pushingArticleId === article.id}
                                  className="h-8 px-3 text-xs rounded-lg border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                >
                                  {pushingArticleId === article.id ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3 mr-1" />
                                  )}
                                  Push
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBindingArticleId(article.id);
                                  setBindingRepoName('');
                                }}
                                className="h-8 px-3 text-xs rounded-lg border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                Bind
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* 手动绑定表单 */}
                        {bindingArticleId === article.id && (
                          <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">Bind to Repository:</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setBindingArticleId(null)}
                                className="h-6 w-6 p-0 rounded-full text-zinc-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="e.g., my-brand-best-ai-tools"
                                value={bindingRepoName}
                                onChange={(e) => setBindingRepoName(e.target.value)}
                                className="flex-1 bg-zinc-900 border-zinc-700 text-sm"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') handleBindArticleToRepo(article.id);
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleBindArticleToRepo(article.id)}
                                disabled={!bindingRepoName.trim()}
                                className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                              >
                                <Link2 className="w-3 h-3 mr-1" />
                                Bind
                              </Button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                              Enter the repository name (e.g., <code>my-brand-best-ai-tools</code>)
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
