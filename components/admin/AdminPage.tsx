import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';

/**
 * Admin 页面入口组件
 * 处理登录状态和 token 管理
 */
export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 检查本地存储的 token
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      // 验证 token 是否有效
      verifyToken(savedToken);
    } else {
      setChecking(false);
    }
  }, []);

  const verifyToken = async (savedToken: string) => {
    try {
      const res = await fetch('/api/admin/auth', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      const data = await res.json();
      if (data.success && data.data?.valid) {
        setToken(savedToken);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
