import React, { useState, useEffect } from 'react';
import { MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getUserId } from '../website-data/utils';

interface GeoRanking {
  id: string;
  location: {
    countryCode: string;
    region?: string;
    city?: string;
  };
  ranking: {
    currentPosition: number | null;
    previousPosition: number | null;
    positionChange: number | null;
  };
  traffic: number | null;
  lastTrackedAt: string | null;
}

interface GeoRankingsData {
  rankings: GeoRanking[];
  stats: {
    byCountry: Array<{
      countryCode: string;
      totalKeywords: number;
      top10Count: number;
      top3Count: number;
      avgPosition: number | null;
      totalLocalTraffic: number;
    }>;
  };
  keyword?: {
    id: string;
    keyword: string;
    translation?: string;
  };
}

interface GeoRankingsViewProps {
  websiteId: string;
  keywordId?: string;
  countryCode?: string;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const GeoRankingsView: React.FC<GeoRankingsViewProps> = ({
  websiteId,
  keywordId,
  countryCode,
  isDarkTheme,
  uiLanguage,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [data, setData] = useState<GeoRankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(countryCode);

  // Load GEO rankings data
  useEffect(() => {
    loadData();
  }, [websiteId, keywordId, selectedCountry]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/geo/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          keywordId,
          countryCode: selectedCountry,
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
            ? '加载 GEO 排名数据失败'
            : 'Failed to load GEO rankings data'
        );
        console.error('[GeoRankings] API error:', errorText);
      }
    } catch (error: any) {
      console.error('[GeoRankings] Failed to load:', error);
      setError(
        uiLanguage === 'zh' ? '网络连接失败' : 'Network connection failed'
      );
    } finally {
      setLoading(false);
    }
  };

  // Format location name
  const formatLocation = (ranking: GeoRanking) => {
    const { countryCode, region, city } = ranking.location;
    const parts = [countryCode];
    if (region) parts.push(region);
    if (city) parts.push(city);
    return parts.join(' - ');
  };

  // Get position badge color
  const getPositionColor = (position: number | null) => {
    if (!position) return 'bg-gray-500';
    if (position <= 3) return 'bg-emerald-500';
    if (position <= 10) return 'bg-blue-500';
    if (position <= 50) return 'bg-amber-500';
    return 'bg-red-500';
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
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
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

  if (!data || data.rankings.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-16',
          isDarkTheme ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-gray-500'
        )}
      >
        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">
          {uiLanguage === 'zh'
            ? '暂无 GEO 排名数据'
            : 'No GEO ranking data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Keyword Info */}
      {data.keyword && (
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
              {uiLanguage === 'zh' ? '关键词' : 'Keyword'}
            </div>
            <div
              className={cn(
                'font-medium',
                isDarkTheme ? 'text-white' : 'text-gray-900'
              )}
            >
              {data.keyword.keyword}
            </div>
            {data.keyword.translation && (
              <div
                className={cn(
                  'text-xs mt-1',
                  isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                )}
              >
                {data.keyword.translation}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats by Country */}
      {data.stats.byCountry.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.stats.byCountry.map((stat) => (
            <Card
              key={stat.countryCode}
              className={cn(
                isDarkTheme
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-white border-gray-200'
              )}
            >
              <CardContent className="pt-6">
                <div
                  className={cn(
                    'text-xs mb-1',
                    isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                  )}
                >
                  {stat.countryCode}
                </div>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    isDarkTheme ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {stat.top10Count}/{stat.totalKeywords}
                </div>
                <div
                  className={cn(
                    'text-xs mt-1',
                    isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                  )}
                >
                  {uiLanguage === 'zh' ? 'Top 10' : 'Top 10'}
                </div>
                <div
                  className={cn(
                    'text-sm mt-2',
                    isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
                  )}
                >
                  {uiLanguage === 'zh' ? '平均排名' : 'Avg'}:{' '}
                  {stat.avgPosition || 'N/A'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rankings List */}
      <Card
        className={cn(
          isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(isDarkTheme ? 'text-white' : 'text-gray-900')}
          >
            {uiLanguage === 'zh' ? '地理排名' : 'Geo Rankings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rankings.map((ranking) => (
              <div
                key={ranking.id}
                className={cn(
                  'p-4 rounded-lg border',
                  isDarkTheme
                    ? 'border-zinc-800 bg-zinc-950'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin
                        className={cn(
                          'w-4 h-4',
                          isDarkTheme ? 'text-emerald-500' : 'text-emerald-600'
                        )}
                      />
                      <span
                        className={cn(
                          'font-medium',
                          isDarkTheme ? 'text-white' : 'text-gray-900'
                        )}
                      >
                        {formatLocation(ranking)}
                      </span>
                    </div>

                    {ranking.ranking.currentPosition && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          getPositionColor(ranking.ranking.currentPosition)
                        )}
                      >
                        #{ranking.ranking.currentPosition}
                      </Badge>
                    )}

                    {ranking.traffic && (
                      <div
                        className={cn(
                          'text-xs mt-1',
                          isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                        )}
                      >
                        {uiLanguage === 'zh' ? '本地流量' : 'Local Traffic'}:{' '}
                        {ranking.traffic.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {ranking.ranking.positionChange !== null &&
                    ranking.ranking.positionChange !== 0 && (
                      <div
                        className={cn(
                          'flex items-center gap-1 text-sm font-medium',
                          ranking.ranking.positionChange > 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        )}
                      >
                        <TrendingUp
                          className={cn(
                            'w-4 h-4',
                            ranking.ranking.positionChange < 0 && 'rotate-180'
                          )}
                        />
                        {Math.abs(ranking.ranking.positionChange)}
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
