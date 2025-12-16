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
    <div className="min-h-screen flex flex-col">
      <Navigation userType="agency" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
