import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authenticated: false,
  loading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // 1. 检查 URL 中是否有 Transfer Token (支持 tt 或 token 参数)
      const urlParams = new URLSearchParams(window.location.search);
      const transferToken = urlParams.get('tt') || urlParams.get('token');

      if (transferToken) {
        console.log('[AuthContext] Found transfer token, verifying...');

        // 立即清除 URL 参数（防止被记录）
        window.history.replaceState({}, '', window.location.pathname);

        // 验证 Transfer Token
        const response = await fetch('/api/auth/verify-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferToken }),
        });

        console.log('[AuthContext] Verify response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthContext] Login successful:', data.user?.email);

          // 保存长期 JWT 到 localStorage
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          setLoading(false);
          return;
        } else {
          const error = await response.json();
          console.error('[AuthContext] Verify failed:', error);
        }
      }

      // 2. 检查本地是否已有 JWT Token
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        // 验证本地 Token
        const response = await fetch('/api/auth/session', {
          headers: { 'Authorization': `Bearer ${storedToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token 无效，清除
          localStorage.removeItem('auth_token');
        }
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';
    window.location.href = mainAppUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: !!user,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
