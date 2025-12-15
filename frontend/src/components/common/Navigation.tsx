'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks';

interface NavigationProps {
  userType: 'agency' | 'client';
}

export const Navigation: React.FC<NavigationProps> = ({ userType }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  const agencyNavLinks = [
    { href: '/agency/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/agency/opportunities', label: 'Opportunities', icon: 'plus' },
    { href: '/agency/tasks', label: 'Follow-Up', icon: 'tasks' },
    { href: '/agency/clients', label: 'Clients', icon: 'users' },
  ];

  const isActivePath = (href: string) => {
    if (href === '/agency/dashboard') {
      return pathname === '/agency/dashboard';
    }
    return pathname?.startsWith(href);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'plus':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'tasks':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href={userType === 'agency' ? '/agency/dashboard' : '/client/dashboard'} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#D32F2F] to-[#C62828] rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">P</span>
                </div>
                <div>
                  <div className="text-[#D32F2F] font-bold">PRISM</div>
                  <div className="text-xs text-gray-500">Public Relations Intelligence System for Media</div>
                </div>
              </Link>

              {/* Agency Nav Links */}
              {userType === 'agency' && (
                <div className="flex gap-1">
                  {agencyNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        isActivePath(link.href)
                          ? 'bg-[#D32F2F] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {getIcon(link.icon)}
                      <span className="text-sm font-medium">{link.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <span className="text-sm text-gray-600">{user.email}</span>
              )}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          {userType === 'agency' ? (
            <>
              <Link
                href="/agency/dashboard"
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  pathname === '/agency/dashboard' ? 'text-[#D32F2F]' : 'text-gray-600'
                }`}
              >
                {getIcon('dashboard')}
                <span className="text-xs">Dashboard</span>
              </Link>
              <Link
                href="/agency/opportunities"
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  pathname?.startsWith('/agency/opportunities') ? 'text-[#D32F2F]' : 'text-gray-600'
                }`}
              >
                {getIcon('plus')}
                <span className="text-xs">Opps</span>
              </Link>
              <Link
                href="/agency/tasks"
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  pathname?.startsWith('/agency/tasks') ? 'text-[#D32F2F]' : 'text-gray-600'
                }`}
              >
                {getIcon('tasks')}
                <span className="text-xs">Tasks</span>
              </Link>
              <Link
                href="/agency/clients"
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  pathname?.startsWith('/agency/clients') ? 'text-[#D32F2F]' : 'text-gray-600'
                }`}
              >
                {getIcon('users')}
                <span className="text-xs">Clients</span>
              </Link>
            </>
          ) : (
            <Link
              href="/client/dashboard"
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                pathname === '/client/dashboard' ? 'text-[#D32F2F]' : 'text-gray-600'
              }`}
            >
              {getIcon('dashboard')}
              <span className="text-xs">Opportunities</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <Link href={userType === 'agency' ? '/agency/dashboard' : '/client/dashboard'} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D32F2F] to-[#C62828] rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <div>
              <div className="text-[#D32F2F] font-bold">PRISM</div>
              <div className="text-xs text-gray-500">Public Relations Intelligence System for Media</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
};
