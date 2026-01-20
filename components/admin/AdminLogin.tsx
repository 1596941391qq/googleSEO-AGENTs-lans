import React, { useState } from 'react';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { cn } from '../../lib/utils';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        localStorage.setItem('admin_token', data.data.token);
        onLogin(data.data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-black text-white">Admin Console</CardTitle>
          <CardDescription className="text-zinc-400">
            PSEO Publishing Management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-10 rounded-xl bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 rounded-xl bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                'Login to Admin'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
