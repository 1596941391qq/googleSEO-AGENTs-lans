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
    const mainAppUrl = import.meta.env.VITE_MAIN_APP_URL || 'https://niche-mining-web.vercel.app';
    const isDev = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_AUTO_LOGIN === 'true';

    try {
      // 1. 检查 URL 中是否有 Transfer Token (支持 tt 或 token 参数)
      const urlParams = new URLSearchParams(window.location.search);
      const transferToken = urlParams.get('tt') || urlParams.get('token');

      if (transferToken) {
        console.log('[AuthContext] Found transfer token, exchanging...');

        // 立即清除 URL 参数（防止被记录）
        window.history.replaceState({}, '', window.location.pathname);

        // 兑换 Transfer Token 为 JWT Token（调用主应用API）
        const response = await fetch(`${mainAppUrl}/api/auth/exchange-transfer-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferToken }),
        });

        console.log('[AuthContext] Exchange response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthContext] Login successful:', data.user?.email);

          // 保存长期 JWT 到 localStorage
          localStorage.setItem('auth_token', data.token);

          // 保存用户信息（转换为统一格式）
          const user = {
            userId: data.user.userId || data.user.id,
            email: data.user.email,
            name: data.user.name,
            picture: data.user.picture,
          };
          console.log('[AuthContext] Saving user to localStorage:', user);
          localStorage.setItem('user', JSON.stringify(user));

          setUser(user);
          setLoading(false);
          return;
        } else {
          const error = await response.json();
          console.error('[AuthContext] Exchange failed:', error);
        }
      }

      // 2. 开发模式下的自动登录 (如果没有 token)
      if (isDev && !localStorage.getItem('auth_token')) {
        console.log('[AuthContext] Development mode: attempting auto-login...');
        try {
          const response = await fetch('/api/auth/verify-transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transferToken: 'dev-token' }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[AuthContext] Dev auto-login successful:', data.user?.email);
            localStorage.setItem('auth_token', data.token);
            const devUser = {
              userId: data.user.userId || data.user.id,
              email: data.user.email,
              name: data.user.name,
              picture: data.user.picture,
            };
            localStorage.setItem('user', JSON.stringify(devUser));
            setUser(devUser);
            setLoading(false);
            return;
          }
        } catch (devError) {
          console.warn('[AuthContext] Dev auto-login failed:', devError);
        }
      }

      // 3. 检查本地是否已有 JWT Token
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        // 优先从 localStorage 加载用户信息
        const storedUser = localStorage.getItem('user');
        console.log('[AuthContext] Stored user string from localStorage:', storedUser);
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('[AuthContext] Parsed user data:', userData);
            setUser(userData);
            console.log('[AuthContext] Loaded user from localStorage:', userData.email);
          } catch (error) {
            console.error('[AuthContext] Failed to parse stored user:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
          }
        } else {
          console.log('[AuthContext] No stored user found, clearing auth_token');
          // 如果没有本地用户信息，清除token
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
