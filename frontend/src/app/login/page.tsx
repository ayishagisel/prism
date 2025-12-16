'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

// Client roles that should go to client dashboard
const CLIENT_ROLES = ['CLIENT_OWNER', 'CLIENT_TEAM'];

// Validate redirect URL is internal (security measure to prevent open redirects)
const isValidRedirect = (url: string | null): url is string => {
  if (!url) return false;
  // Must start with / and not contain :// (prevents external redirects)
  return url.startsWith('/') && !url.includes('://');
};

// Get default redirect based on user role
const getDefaultRedirect = (role: string): string => {
  return CLIENT_ROLES.includes(role) ? '/client/dashboard' : '/agency/dashboard';
};

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('amore@applesandorangespr.com');
  const [password, setPassword] = useState('');
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
            // Token is valid, redirect to intended destination or default
            const role = res.data?.role;
            const destination = isValidRedirect(redirectParam)
              ? redirectParam
              : getDefaultRedirect(role);
            router.push(destination);
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
  }, [router, redirectParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login(email, password);
      if (res.success) {
        // Redirect to intended destination or default based on role
        const role = res.data?.user?.role;
        const destination = isValidRedirect(redirectParam)
          ? redirectParam
          : getDefaultRedirect(role);
        router.push(destination);
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="enter your password"
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
            <p className="font-semibold text-gray-900 mb-2">Demo Mode</p>
            <div className="space-y-1">
              <p>
                <span className="font-medium">Agency Admin:</span>{' '}
                <code className="bg-white px-1 py-0.5 rounded text-xs">amore@applesandorangespr.com</code>
              </p>
              <p>
                <span className="font-medium">Client Portal:</span>{' '}
                <code className="bg-white px-1 py-0.5 rounded text-xs">client@demo.com</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary for useSearchParams
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
