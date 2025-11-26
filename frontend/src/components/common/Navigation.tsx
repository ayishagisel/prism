import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';

interface NavigationProps {
  userType: 'agency' | 'client';
}

export const Navigation: React.FC<NavigationProps> = ({ userType }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const agencyNavLinks = [
    { href: '/agency/dashboard', label: 'Dashboard' },
    { href: '/agency/opportunities', label: 'Opportunities' },
    { href: '/agency/tasks', label: 'Tasks' },
    { href: '/agency/clients', label: 'Clients' },
  ];

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
                {agencyNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 hover:text-primary transition text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user && <span className="hidden sm:inline text-sm text-gray-600">{user.email}</span>}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-primary transition text-sm font-medium"
            >
              Logout
            </button>
            {userType === 'agency' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-600 hover:text-primary transition p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {userType === 'agency' && mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {agencyNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50 transition text-sm font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
