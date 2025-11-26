'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOpportunities, useTasks, useClients } from '@/lib/hooks';
import { DashboardKPIs } from '@/components/agency/DashboardKPIs';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';

export default function DashboardPage() {
  const { opportunities, loading: oppLoading } = useOpportunities();
  const { tasks, loading: tasksLoading } = useTasks();
  const { clients } = useClients();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedResponse, setSelectedResponse] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('');

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

  // Filter opportunities based on search and dropdowns
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Client filter
      const matchesClient = !selectedClient || opp.assigned_client_id === selectedClient;

      // Response filter (based on status)
      const matchesResponse =
        !selectedResponse ||
        opp.status === selectedResponse;

      // Media type filter
      const matchesMediaType =
        !selectedMediaType ||
        opp.media_type === selectedMediaType;

      return matchesSearch && matchesClient && matchesResponse && matchesMediaType;
    });
  }, [opportunities, searchQuery, selectedClient, selectedResponse, selectedMediaType]);

  const recentTasks = tasks.slice(0, 5);

  // Get unique media types from opportunities
  const mediaTypes = Array.from(new Set(opportunities.map((o) => o.media_type).filter(Boolean)));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agency Dashboard</h1>
        <p className="text-gray-600">Overview of your PR opportunities and tasks</p>
      </div>

      <DashboardKPIs kpis={kpis} />

      {/* Advanced Filters */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            🔍 Advanced Filters
          </h3>
          <span className="text-sm text-gray-600">
            {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Response Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Response
            </label>
            <select
              value={selectedResponse}
              onChange={(e) => setSelectedResponse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Responses</option>
              <option value="pending">Pending</option>
              <option value="interested">Interested</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="no_response">No Response</option>
            </select>
          </div>

          {/* Media Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Media Type</label>
            <select
              value={selectedMediaType}
              onChange={(e) => setSelectedMediaType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Categories</option>
              {mediaTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || selectedClient || selectedResponse || selectedMediaType) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedClient('');
                setSelectedResponse('');
                setSelectedMediaType('');
              }}
              className="text-sm text-primary hover:text-red-700 font-medium transition"
            >
              ✕ Clear all filters
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Opportunities</h2>
            <Link href="/agency/opportunities" className="text-primary hover:text-red-700 text-sm">
              View All →
            </Link>
          </div>
          <OpportunitiesTable opportunities={filteredOpportunities.slice(0, 5)} />
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
