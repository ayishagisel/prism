'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/common/Navigation';
import { useAuth } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation userType="agency" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </>
  );
}
