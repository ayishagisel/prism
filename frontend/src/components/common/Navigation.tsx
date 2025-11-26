import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';

interface NavigationProps {
  userType: 'agency' | 'client';
}

export const Navigation: React.FC<NavigationProps> = ({ userType }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href={userType === 'agency' ? '/agency/dashboard' : '/client/opportunities'}>
              <span className="text-xl font-bold text-primary">PRISM</span>
            </Link>

            {userType === 'agency' && (
              <div className="hidden md:flex gap-6">
                <Link
                  href="/agency/dashboard"
                  className="text-gray-600 hover:text-primary transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/agency/opportunities"
                  className="text-gray-600 hover:text-primary transition"
                >
                  Opportunities
                </Link>
                <Link href="/agency/tasks" className="text-gray-600 hover:text-primary transition">
                  Tasks
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && <span className="text-sm text-gray-600">{user.email}</span>}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-primary transition text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
