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
  Clock
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
  rtd: { name: 'Read the Docs', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  cf_pages: { name: 'Cloudflare Pages', icon: Cloud, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  netlify: { name: 'Netlify', icon: Zap, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  vercel: { name: 'Vercel', icon: Triangle, color: 'text-white', bg: 'bg-zinc-700' },
};

const CONTENT_TYPE_CONFIG = {
  informational: { label: '📚 信息型', color: 'bg-blue-500', platforms: ['RTD', 'CF Pages'] },
  commercial: { label: '🏷️ 商业型', color: 'bg-amber-500', platforms: ['Netlify', 'Vercel', 'CF Pages'] },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Pending' },
  active: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/20', label: 'Active' },
  disabled: { icon: AlertCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/20', label: 'Disabled' },
};

export function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [githubTokens, setGitHubTokens] = useState<GitHubToken[]>([]);
  const [platformTokens, setPlatformTokens] = useState<PlatformToken[]>([]);
  const [sites, setSites] = useState<PlatformSite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'github' | 'platform' | 'sites'>('github');
  const [showHelp, setShowHelp] = useState(false);

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
    platform: 'rtd',
    name: '',
    token: ''
  });

  // 新建站点表单
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSite, setNewSite] = useState({
    github_token_id: '',
    platform_token_id: '',
    platform: 'rtd',
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
      const [tokensRes, sitesRes] = await Promise.all([
        fetch('/api/admin/tokens', { headers }),
        fetch('/api/admin/sites', { headers })
      ]);

      const tokensData = await tokensRes.json();
      const sitesData = await sitesRes.json();

      if (tokensData.success) {
        setGitHubTokens(tokensData.data.githubTokens || []);
        setPlatformTokens(tokensData.data.platformTokens || []);
        setStats(tokensData.data.stats || null);
      }
      if (sitesData.success) {
        setSites(sitesData.data.sites || []);
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
        setNewPlatformToken({ platform: 'rtd', name: '', token: '' });
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
                githubTokens.map((t) => (
                  <Card key={t.id} className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-4 flex items-center justify-between">
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
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                            <span>Token: {t.token_preview}</span>
                            <span>•</span>
                            <span>Used: {t.usage_count}x</span>
                            <span>•</span>
                            <span>Sites: {sites.filter(s => s.github_token_id === t.id).length}</span>
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
                    </CardContent>
                  </Card>
                ))
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
                  return (
                    <Card key={t.id} className="border-zinc-800 bg-zinc-900/50">
                      <CardContent className="p-4 flex items-center justify-between">
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
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
    </div>
  );
}
