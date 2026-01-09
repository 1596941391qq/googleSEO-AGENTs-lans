import React, { useState, useEffect } from 'react';
import { Target, Zap, TrendingUp, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getUserId } from '../website-data/utils';

interface GeoOpportunity {
  id: string;
  keyword: string;
  translation?: string;
  targetLocation: {
    country: string;
    region?: string;
    city?: string;
  };
  currentPosition: number;
  potentialPosition: number;
  positionGap: number;
  estimatedTrafficGain: number;
  difficulty: number;
  effortRequired: string;
  suggestions: string;
  status: string;
  actualRanking?: {
    position: number;
    traffic: number;
  };
}

interface GeoOpportunitiesData {
  opportunities: GeoOpportunity[];
  stats: {
    total: number;
    totalPotentialTraffic: number;
    avgDifficulty: number | null;
    byStatus: {
      pending: number;
      inProgress: number;
      completed: number;
    };
    byCountry: Array<{
      country: string;
      opportunityCount: number;
      potentialTrafficGain: number;
      avgPositionGap: number | null;
    }>;
  };
}

interface GeoOpportunitiesViewProps {
  websiteId: string;
  targetCountry?: string;
  minPositionGap?: number;
  status?: string;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const GeoOpportunitiesView: React.FC<GeoOpportunitiesViewProps> = ({
  websiteId,
  targetCountry,
  minPositionGap,
  status,
  isDarkTheme,
  uiLanguage,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [data, setData] = useState<GeoOpportunitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(status);

  useEffect(() => {
    loadData();
  }, [websiteId, targetCountry, minPositionGap, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/geo/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          targetCountry,
          minPositionGap,
          status: filterStatus,
          limit: 100,
          userId: currentUserId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        const errorText = await response.text();
        setError(
          uiLanguage === 'zh'
            ? '加载 GEO 机会数据失败'
            : 'Failed to load GEO opportunities'
        );
        console.error('[GeoOpportunities] API error:', errorText);
      }
    } catch (error: any) {
      console.error('[GeoOpportunities] Failed to load:', error);
      setError(
        uiLanguage === 'zh' ? '网络连接失败' : 'Network connection failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatLocation = (location: GeoOpportunity['targetLocation']) => {
    const parts = [location.country];
    if (location.region) parts.push(location.region);
    if (location.city) parts.push(location.city);
    return parts.join(' - ');
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return 'text-emerald-500';
    if (difficulty <= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  const updateStatus = async (opportunityId: string, newStatus: string) => {
    try {
      // TODO: Implement status update API
      console.log('Update status:', opportunityId, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-16',
          isDarkTheme ? 'bg-zinc-900' : 'bg-white'
        )}
      >
        <div className="text-center">
          <div
            className={cn(
              'w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'
            )}
          />
          <span
            className={cn(
              'text-sm',
              isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
            )}
          >
            {uiLanguage === 'zh' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center py-16',
          isDarkTheme ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-gray-500'
        )}
      >
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={loadData}
            className={cn(
              'px-4 py-2 text-sm rounded-lg',
              isDarkTheme
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            )}
          >
            {uiLanguage === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.opportunities.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-16',
          isDarkTheme ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-gray-500'
        )}
      >
        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">
          {uiLanguage === 'zh'
            ? '暂无 GEO ��化机会'
            : 'No GEO optimization opportunities available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                'text-xs mb-1',
                isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {uiLanguage === 'zh' ? '总机会' : 'Total Opportunities'}
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                isDarkTheme ? 'text-white' : 'text-gray-900'
              )}
            >
              {data.stats.total}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                'text-xs mb-1',
                isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {uiLanguage === 'zh' ? '潜在流量增长' : 'Potential Traffic Gain'}
            </div>
            <div
              className={cn(
                'text-2xl font-bold text-emerald-500'
              )}
            >
              {data.stats.totalPotentialTraffic.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                'text-xs mb-1',
                isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {uiLanguage === 'zh' ? '平均难度' : 'Avg Difficulty'}
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                isDarkTheme ? 'text-white' : 'text-gray-900'
              )}
            >
              {data.stats.avgDifficulty || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                'text-xs mb-1',
                isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {uiLanguage === 'zh' ? '待处理' : 'Pending'}
            </div>
            <div
              className={cn(
                'text-2xl font-bold text-amber-500'
              )}
            >
              {data.stats.byStatus.pending}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        <Button
          variant={!filterStatus ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus(undefined)}
          className={cn(
            !filterStatus && 'bg-emerald-500 hover:bg-emerald-600 text-white'
          )}
        >
          {uiLanguage === 'zh' ? '全部' : 'All'}
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('pending')}
        >
          {uiLanguage === 'zh' ? '待处理' : 'Pending'}
        </Button>
        <Button
          variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('in_progress')}
        >
          {uiLanguage === 'zh' ? '进行中' : 'In Progress'}
        </Button>
        <Button
          variant={filterStatus === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('completed')}
        >
          {uiLanguage === 'zh' ? '已完成' : 'Completed'}
        </Button>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {data.opportunities.map((opportunity) => (
          <Card
            key={opportunity.id}
            className={cn(
              isDarkTheme
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-white border-gray-200'
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div
                    className={cn(
                      'font-medium mb-1',
                      isDarkTheme ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {opportunity.keyword}
                  </div>
                  {opportunity.translation && (
                    <div
                      className={cn(
                        'text-xs mb-2',
                        isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                      )}
                    >
                      {opportunity.translation}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin
                      className={cn(
                        'w-4 h-4',
                        isDarkTheme ? 'text-emerald-500' : 'text-emerald-600'
                      )}
                    />
                    <span
                      className={cn(
                        isDarkTheme ? 'text-zinc-300' : 'text-gray-700'
                      )}
                    >
                      {formatLocation(opportunity.targetLocation)}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    getStatusColor(opportunity.status)
                  )}
                >
                  {opportunity.status}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div
                    className={cn(
                      'text-xs mb-1',
                      isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    {uiLanguage === 'zh' ? '当前排名' : 'Current Position'}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      isDarkTheme ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    #{opportunity.currentPosition}
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      'text-xs mb-1',
                      isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    {uiLanguage === 'zh' ? '潜在排名' : 'Potential Position'}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold text-emerald-500'
                    )}
                  >
                    #{opportunity.potentialPosition}
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      'text-xs mb-1',
                      isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    {uiLanguage === 'zh' ? '排名差距' : 'Position Gap'}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold text-amber-500'
                    )}
                  >
                    +{opportunity.positionGap}
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      'text-xs mb-1',
                      isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    {uiLanguage === 'zh' ? '流量增长' : 'Traffic Gain'}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold text-blue-500'
                    )}
                  >
                    {opportunity.estimatedTrafficGain.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div
                  className={cn(
                    'text-xs mb-1',
                    isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                  )}
                >
                  {uiLanguage === 'zh' ? '难度' : 'Difficulty'}
                </div>
                <div
                  className={cn(
                    'text-sm font-medium',
                    getDifficultyColor(opportunity.difficulty)
                  )}
                >
                  {opportunity.difficulty}/100
                </div>
              </div>

              {opportunity.suggestions && (
                <div className="mb-4">
                  <div
                    className={cn(
                      'text-xs mb-1',
                      isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    {uiLanguage === 'zh' ? '优化建议' : 'Optimization Suggestions'}
                  </div>
                  <div
                    className={cn(
                      'text-sm',
                      isDarkTheme ? 'text-zinc-300' : 'text-gray-700'
                    )}
                  >
                    {opportunity.suggestions}
                  </div>
                </div>
              )}

              {opportunity.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(opportunity.id, 'in_progress')}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {uiLanguage === 'zh' ? '开始优化' : 'Start Optimizing'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
