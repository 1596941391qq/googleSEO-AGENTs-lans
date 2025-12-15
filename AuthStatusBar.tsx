import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

// 主应用 URL - 可以通过环境变量配置
const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';

export const AuthStatusBar: React.FC = () => {
  const { user, authenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span>正在验证登录状态...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <User className="w-4 h-4" />
            <span className="font-medium">未登录</span>
            <span className="text-yellow-600">- 请从主应用启动此工具</span>
            <a
              href={MAIN_APP_URL}
              className="ml-auto text-blue-600 hover:text-blue-700 underline text-sm"
            >
              前往主应用
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-b border-green-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.picture && (
            <img
              src={user.picture}
              alt={user.name || 'User'}
              className="w-7 h-7 rounded-full border-2 border-green-300"
            />
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-900">
                {user?.name || user?.email}
              </span>
            </div>
            {user?.name && (
              <span className="text-xs text-green-600">{user.email}</span>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-700 hover:text-green-900 hover:bg-green-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>登出</span>
        </button>
      </div>
    </div>
  );
};
