'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('amore@applesandorangespr.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token is still valid before redirecting
      const verifyToken = async () => {
        try {
          const res = await apiClient.getMe();
          if (res.success) {
            // Token is valid, redirect to dashboard
            router.push('/agency/dashboard');
          } else {
            // Token is invalid, clear it and stay on login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (err) {
          // Token is invalid, clear it and stay on login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      };
      verifyToken();
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login(email);
      if (res.success) {
        router.push('/agency/dashboard');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">PRISM</h1>
            <p className="text-gray-600 text-sm">PR Intelligence & Signal Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-100 text-red-800 p-3 rounded text-sm">{error}</div>}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50 py-3 font-semibold"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary font-semibold hover:text-primary-dark">
              Forgot Password?
            </Link>
            <Link href="/register" className="text-primary font-semibold hover:text-primary-dark">
              Sign Up
            </Link>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600">
            <p className="font-semibold text-gray-900 mb-1">Demo Mode</p>
            <p>
              Try logging in with any email address. Demo data is pre-loaded for{' '}
              <code className="bg-white px-2 py-1 rounded">amore@applesandorangespr.com</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
