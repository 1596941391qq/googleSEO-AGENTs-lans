import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Link2, 
  Unlink, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  Github,
  Globe
} from 'lucide-react';

interface GitHubToken {
  id: string;
  name: string;
  owner_name: string;
  github_token_id: string | null;
  usage_count: number;
  status: 'active' | 'disabled';
  token_preview: string;
}

interface PlatformToken {
  id: string;
  platform: string;
  name: string;
  github_token_id: string | null;
  usage_count: number;
  status: 'active' | 'disabled';
  token_preview: string;
}

interface TokenPair {
  github: GitHubToken;
  platform: PlatformToken;
}

interface TokenData {
  bound: TokenPair[];
  unboundGithub: GitHubToken[];
  unboundPlatform: PlatformToken[];
}

export function AdminTokenManager() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 创建 GitHub Token 表单
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [githubName, setGithubName] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubOwner, setGithubOwner] = useState('');

  // 创建 Platform Token 表单
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [platformToken, setPlatformToken] = useState('');
  const [platformType, setPlatformType] = useState('netlify');

  // 加载 Token 数据
  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Admin Token Manager] Loading tokens...');

      const response = await fetch('/api/admin/tokens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      console.log('[Admin Token Manager] Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to load tokens');
      }

      const result = await response.json();

      console.log('[Admin Token Manager] Received data:', {
        success: result.success,
        dataKeys: result.data ? Object.keys(result.data) : 'null',
        boundCount: result.data?.bound?.length || 0,
        unboundGithubCount: result.data?.unboundGithub?.length || 0,
        unboundPlatformCount: result.data?.unboundPlatform?.length || 0,
        rawData: result.data
      });

      setTokenData(result.data);
    } catch (err: any) {
      console.error('[Admin Token Manager] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  // 创建 GitHub Token
  const handleCreateGithubToken = async () => {
    if (!githubName || !githubToken || !githubOwner) {
      alert('请填写所有字段');
      return;
    }

    try {
      const response = await fetch('/api/admin/tokens?type=github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: githubName,
          token: githubToken,
          owner_name: githubOwner
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create GitHub token');
      }

      // 重置表单
      setGithubName('');
      setGithubToken('');
      setGithubOwner('');
      setShowGithubForm(false);

      // 重新加载
      await loadTokens();
      alert('GitHub Token 创建成功！');
    } catch (err: any) {
      alert(`创建失败: ${err.message}`);
    }
  };

  // 创建 Platform Token
  const handleCreatePlatformToken = async () => {
    if (!platformName || !platformToken) {
      alert('请填写所有字段');
      return;
    }

    try {
      const response = await fetch('/api/admin/tokens?type=platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: platformName,
          token: platformToken,
          platform: platformType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create platform token');
      }

      // 重置表单
      setPlatformName('');
      setPlatformToken('');
      setPlatformType('netlify');
      setShowPlatformForm(false);

      // 重新加载
      await loadTokens();
      alert('Platform Token 创建成功！');
    } catch (err: any) {
      alert(`创建失败: ${err.message}`);
    }
  };

  // 绑定 Token
  const handleBindTokens = async (githubTokenId: string, platformTokenId: string, platform: string) => {
    if (!confirm('确定要绑定这两个 Token 吗？')) return;

    try {
      const response = await fetch('/api/admin/tokens?action=bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          githubTokenId,
          platformTokenId,
          platform
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bind tokens');
      }

      await loadTokens();
      alert('Token 绑定成功！');
    } catch (err: any) {
      alert(`绑定失败: ${err.message}`);
    }
  };

  // 解绑 Token
  const handleUnbindTokens = async (githubTokenId: string, platformTokenId: string) => {
    if (!confirm('确定要解绑这对 Token 吗？')) return;

    try {
      const response = await fetch('/api/admin/tokens?action=unbind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          githubTokenId,
          platformTokenId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unbind tokens');
      }

      await loadTokens();
      alert('Token 解绑成功！');
    } catch (err: any) {
      alert(`解绑失败: ${err.message}`);
    }
  };

  // 删除 Token
  const handleDeleteToken = async (tokenId: string, type: 'github' | 'platform') => {
    if (!confirm(`确定要删除这个 ${type === 'github' ? 'GitHub' : 'Platform'} Token 吗？`)) return;

    try {
      const response = await fetch(`/api/admin/tokens?type=${type}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ tokenId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete token');
      }

      await loadTokens();
      alert('Token 删除成功！');
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>加载失败: {error}</span>
        </div>
        <Button onClick={loadTokens} className="mt-2" variant="outline" size="sm">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="text-sm font-mono">
              <p>Debug Info:</p>
              <p>tokenData: {tokenData ? 'exists' : 'null'}</p>
              <p>unboundGithub count: {tokenData?.unboundGithub?.length || 0}</p>
              <p>unboundPlatform count: {tokenData?.unboundPlatform?.length || 0}</p>
              <p>bound count: {tokenData?.bound?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Token 管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理 GitHub 和 Platform Token，实现发布功能
          </p>
        </div>
        <Button onClick={loadTokens} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* 已绑定的 Token 对 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-green-600" />
            已绑定的 Token 对 ({tokenData?.bound.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokenData?.bound.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>暂无已绑定的 Token 对</p>
              <p className="text-sm mt-1">请先创建 Token，然后进行绑定</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokenData?.bound.map((pair) => (
                <div
                  key={pair.github.id}
                  className="border rounded-lg p-4 bg-green-50 border-green-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      {/* GitHub Token */}
                      <div className="flex items-start gap-3">
                        <Github className="w-5 h-5 mt-1 text-gray-700" />
                        <div className="flex-1">
                          <div className="font-medium">{pair.github.name}</div>
                          <div className="text-sm text-gray-600">
                            Owner: {pair.github.owner_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Token: {pair.github.token_preview}
                          </div>
                          <div className="text-xs text-gray-500">
                            使用次数: {pair.github.usage_count}
                          </div>
                        </div>
                      </div>

                      {/* Platform Token */}
                      <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 mt-1 text-blue-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{pair.platform.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {pair.platform.platform}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Token: {pair.platform.token_preview}
                          </div>
                          <div className="text-xs text-gray-500">
                            使用次数: {pair.platform.usage_count}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 解绑按钮 */}
                    <Button
                      onClick={() => handleUnbindTokens(pair.github.id, pair.platform.id)}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      <Unlink className="w-4 h-4 mr-1" />
                      解绑
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 未绑定的 GitHub Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              未绑定的 GitHub Tokens ({tokenData?.unboundGithub.length || 0})
            </div>
            <Button
              onClick={() => setShowGithubForm(!showGithubForm)}
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加 GitHub Token
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 创建表单 */}
          {showGithubForm && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">创建 GitHub Token</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Token 名称 (例如: GitHub Bot 1)"
                  value={githubName}
                  onChange={(e) => setGithubName(e.target.value)}
                />
                <Input
                  placeholder="GitHub Owner (用户名或组织名)"
                  value={githubOwner}
                  onChange={(e) => setGithubOwner(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="GitHub Personal Access Token"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateGithubToken} size="sm">
                    创建
                  </Button>
                  <Button
                    onClick={() => setShowGithubForm(false)}
                    size="sm"
                    variant="outline"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Token 列表 */}
          {tokenData?.unboundGithub.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              暂无未绑定的 GitHub Token
            </div>
          ) : (
            <div className="space-y-2">
              {tokenData?.unboundGithub.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{token.name}</div>
                    <div className="text-sm text-gray-600">
                      Owner: {token.owner_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {token.token_preview} · 使用 {token.usage_count} 次
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {tokenData?.unboundPlatform.length > 0 && (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            const [platformTokenId, platform] = e.target.value.split(':');
                            handleBindTokens(token.id, platformTokenId, platform);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">绑定到平台...</option>
                        {tokenData?.unboundPlatform.map((platform) => (
                          <option key={platform.id} value={`${platform.id}:${platform.platform}`}>
                            {platform.name} ({platform.platform})
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      onClick={() => handleDeleteToken(token.id, 'github')}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 未绑定的 Platform Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              未绑定的 Platform Tokens ({tokenData?.unboundPlatform.length || 0})
            </div>
            <Button
              onClick={() => setShowPlatformForm(!showPlatformForm)}
              size="sm"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加 Platform Token
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 创建表单 */}
          {showPlatformForm && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">创建 Platform Token</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={platformType}
                    onChange={(e) => setPlatformType(e.target.value)}
                  >
                    <option value="netlify">Netlify</option>
                    <option value="vercel">Vercel</option>
                    <option value="cf_pages">Cloudflare Pages</option>
                    <option value="rtd">Read the Docs</option>
                  </select>
                </div>
                <Input
                  placeholder="Token 名称 (例如: Netlify Bot 1)"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder={`${platformType === 'netlify' ? 'Netlify' : platformType === 'vercel' ? 'Vercel' : platformType === 'cf_pages' ? 'Cloudflare Pages' : 'Read the Docs'} Personal Access Token`}
                  value={platformToken}
                  onChange={(e) => setPlatformToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreatePlatformToken} size="sm">
                    创建
                  </Button>
                  <Button
                    onClick={() => setShowPlatformForm(false)}
                    size="sm"
                    variant="outline"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Token 列表 */}
          {tokenData?.unboundPlatform.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              暂无未绑定的 Platform Token
            </div>
          ) : (
            <div className="space-y-2">
              {tokenData?.unboundPlatform.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{token.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {token.platform}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {token.token_preview} · 使用 {token.usage_count} 次
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {tokenData?.unboundGithub.length > 0 && (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBindTokens(e.target.value, token.id, token.platform);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">绑定到 GitHub...</option>
                        {tokenData?.unboundGithub.map((github) => (
                          <option key={github.id} value={github.id}>
                            {github.name} ({github.owner_name})
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      onClick={() => handleDeleteToken(token.id, 'platform')}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            使用说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>1. <strong>创建 Token</strong>：分别创建 GitHub Token 和 Platform Token（Netlify/Vercel/CF Pages/RTD）</p>
          <p>2. <strong>绑定 Token</strong>：将 GitHub Token 和 Platform Token 进行绑定</p>
          <p>3. <strong>发布文章</strong>：系统会自动使用已绑定的 Token 对发布文章</p>
          <p className="pt-2 border-t border-blue-300">
            ⚠️ <strong>重要</strong>：GitHub Token 和 Platform Token 必须属于同一个账号，否则平台无法访问 GitHub 仓库
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

