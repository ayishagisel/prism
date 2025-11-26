'use client';

import React from 'react';
import Link from 'next/link';
import { useOpportunities, useTasks } from '@/lib/hooks';
import { DashboardKPIs } from '@/components/agency/DashboardKPIs';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';

export default function DashboardPage() {
  const { opportunities, loading: oppLoading } = useOpportunities();
  const { tasks, loading: tasksLoading } = useTasks();

  const kpis = [
    {
      label: 'Active Opportunities',
      value: opportunities.filter((o) => o.status === 'active').length,
      icon: '📋',
      color: 'text-primary',
    },
    {
      label: 'Pending Responses',
      value: 8,
      icon: '⏳',
      color: 'text-yellow-600',
    },
    {
      label: 'Accepted Opportunities',
      value: 3,
      icon: '✅',
      color: 'text-success',
    },
    {
      label: 'Tasks Due Soon',
      value: tasks.filter((t) => t.status === 'pending').length,
      icon: '📌',
      color: 'text-blue-600',
    },
  ];

  if (oppLoading || tasksLoading) {
    return <LoadingSpinner />;
  }

  const recentTasks = tasks.slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agency Dashboard</h1>
        <p className="text-gray-600">Overview of your PR opportunities and tasks</p>
      </div>

      <DashboardKPIs kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Opportunities</h2>
            <Link href="/agency/opportunities" className="text-primary hover:text-red-700 text-sm">
              View All →
            </Link>
          </div>
          <OpportunitiesTable opportunities={opportunities.slice(0, 5)} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Tasks</h2>
            <Link href="/agency/tasks" className="text-primary hover:text-red-700 text-sm">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500 text-sm">No tasks yet</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="card p-4 hover:shadow-md transition">
                  <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusChip status={task.status} />
                    <span className="text-xs text-gray-500">{task.priority}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
