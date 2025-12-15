'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useOpportunities, useTasks, useClients } from '@/lib/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';

// Tooltip component for KPI info icons
const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap max-w-xs">
          <div className="whitespace-normal">{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DashboardPage() {
  // Refresh triggers for data refetching
  const [oppRefresh, setOppRefresh] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(0);

  const { opportunities, loading: oppLoading } = useOpportunities(oppRefresh);
  const { tasks, loading: tasksLoading } = useTasks(taskRefresh);
  const { clients } = useClients();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedResponse, setSelectedResponse] = useState('');
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<'active' | 'accepted' | 'interested' | null>(null);

  // Handle KPI card click - toggle filter
  const handleKpiCardClick = (filter: 'active' | 'accepted' | 'interested') => {
    setSelectedKpiFilter(selectedKpiFilter === filter ? null : filter);
  };

  // Listen for storage changes (when tasks are created in modal)
  useEffect(() => {
    const handleStorageChange = () => {
      setTaskRefresh((prev) => prev + 1);
      setOppRefresh((prev) => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Calculate KPIs
  const activeOppsCount = opportunities.filter((o) => o.status === 'active').length;

  // Count accepted and interested from client_statuses (response_state), not opportunity status
  const acceptedCount = opportunities.reduce((count, opp: any) => {
    if (opp.client_statuses && Array.isArray(opp.client_statuses)) {
      return count + opp.client_statuses.filter((cs: any) => cs.response_state === 'accepted').length;
    }
    return count;
  }, 0);

  const interestedCount = opportunities.reduce((count, opp: any) => {
    if (opp.client_statuses && Array.isArray(opp.client_statuses)) {
      return count + opp.client_statuses.filter((cs: any) => cs.response_state === 'interested').length;
    }
    return count;
  }, 0);

  // New responses count (accepted + interested)
  const newResponsesCount = acceptedCount + interestedCount;

  // Calculate Avg. Response Time
  const calculateAvgResponseTime = (): string => {
    // Get all opportunities with client_statuses that have responded_at
    const respondedOpps: { sentAt: Date; respondedAt: Date }[] = [];

    opportunities.forEach((opp: any) => {
      if (opp.client_statuses && Array.isArray(opp.client_statuses)) {
        opp.client_statuses.forEach((cs: any) => {
          if (cs.responded_at && cs.response_state !== 'pending' && cs.response_state !== 'no_response') {
            respondedOpps.push({
              sentAt: new Date(opp.created_at),
              respondedAt: new Date(cs.responded_at)
            });
          }
        });
      }
    });

    if (respondedOpps.length === 0) {
      return '—';
    }

    // Calculate total response time in milliseconds
    const totalResponseTimeMs = respondedOpps.reduce((sum, item) => {
      const responseTime = item.respondedAt.getTime() - item.sentAt.getTime();
      return sum + Math.max(0, responseTime); // Ensure non-negative
    }, 0);

    const avgResponseTimeMs = totalResponseTimeMs / respondedOpps.length;
    const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);

    // Format based on duration
    if (avgResponseTimeHours < 24) {
      return `${avgResponseTimeHours.toFixed(1)}h`;
    } else {
      const avgResponseTimeDays = avgResponseTimeHours / 24;
      return `${avgResponseTimeDays.toFixed(1)}d`;
    }
  };

  const avgResponseTime = calculateAvgResponseTime();

  // State for operational metrics (fetched from API)
  const [escalatedChatsCount, setEscalatedChatsCount] = useState(0);
  const [pendingRestoreCount, setPendingRestoreCount] = useState(0);

  // Fetch operational metrics
  useEffect(() => {
    const fetchOperationalMetrics = async () => {
      try {
        // Fetch escalated chats count
        const chatsResponse = await apiClient.getDashboardEscalatedChats();
        if (chatsResponse.success && chatsResponse.data) {
          setEscalatedChatsCount(chatsResponse.data.length);
        }
      } catch (err) {
        console.error('Failed to fetch escalated chats:', err);
      }

      try {
        // Fetch pending restore requests count
        const restoreResponse = await apiClient.getPendingRestoreRequests();
        if (Array.isArray(restoreResponse)) {
          setPendingRestoreCount(restoreResponse.length);
        }
      } catch (err) {
        console.error('Failed to fetch restore requests:', err);
      }
    };
    fetchOperationalMetrics();
  }, []);

  // Calculate client response rate
  const calculateResponseRate = (): number => {
    // Count total shared opportunities (opportunities with at least one client_status)
    const sharedOpps = opportunities.filter((opp: any) =>
      opp.client_statuses && opp.client_statuses.length > 0
    );

    if (sharedOpps.length === 0) return 0;

    // Count opportunities where at least one client has responded (not pending/no_response)
    const respondedOpps = sharedOpps.filter((opp: any) =>
      opp.client_statuses.some((cs: any) =>
        cs.response_state &&
        cs.response_state !== 'pending' &&
        cs.response_state !== 'no_response'
      )
    );

    return Math.round((respondedOpps.length / sharedOpps.length) * 100);
  };

  const responseRate = calculateResponseRate();

  // Calculate opportunities approaching deadline (within 7 days)
  const approachingDeadlineCount = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return opportunities.filter((opp: any) => {
      if (!opp.deadline_at || opp.status !== 'active') return false;
      const deadline = new Date(opp.deadline_at);
      return deadline > now && deadline <= sevenDaysFromNow;
    }).length;
  }, [opportunities]);

  // Calculate unassigned opportunities (no clients assigned yet)
  const unassignedCount = useMemo(() => {
    return opportunities.filter((opp: any) =>
      !opp.client_statuses || opp.client_statuses.length === 0
    ).length;
  }, [opportunities]);

  // Response state options for filtering
  const responseStates = ['pending', 'interested', 'accepted', 'declined', 'no_response'];

  // Filter opportunities based on search and dropdowns
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp: any) => {
      const matchesSearch =
        !searchQuery ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMediaType =
        !selectedMediaType ||
        opp.media_type === selectedMediaType;

      // Client filter - check if opportunity has this client assigned
      const matchesClient =
        !selectedClient ||
        (opp.client_statuses && opp.client_statuses.some((cs: any) => cs.client_id === selectedClient));

      // Response state filter - check if any client status matches
      const matchesResponse =
        !selectedResponse ||
        (opp.client_statuses && opp.client_statuses.some((cs: any) => cs.response_state === selectedResponse));

      // KPI card filter
      let matchesKpiFilter = true;
      if (selectedKpiFilter === 'active') {
        matchesKpiFilter = opp.status === 'active';
      } else if (selectedKpiFilter === 'accepted') {
        matchesKpiFilter = opp.client_statuses && opp.client_statuses.some((cs: any) => cs.response_state === 'accepted');
      } else if (selectedKpiFilter === 'interested') {
        matchesKpiFilter = opp.client_statuses && opp.client_statuses.some((cs: any) => cs.response_state === 'interested');
      }

      return matchesSearch && matchesMediaType && matchesClient && matchesResponse && matchesKpiFilter;
    });
  }, [opportunities, searchQuery, selectedMediaType, selectedClient, selectedResponse, selectedKpiFilter]);

  // Get unique media types from opportunities
  const mediaTypes = Array.from(new Set(opportunities.map((o) => o.media_type).filter(Boolean)));

  // Get only 4 most recent opportunities for glance view
  const recentOpportunities = filteredOpportunities.slice(0, 4);

  // Get 4 most recent tasks for glance view
  const recentTasks = tasks.slice(0, 4);

  if (oppLoading || tasksLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 via-white to-red-50/30 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#D32F2F] to-[#C62828] bg-clip-text text-transparent">
              PR Team Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm text-gray-600">Real-time monitoring powered by PRISM AI</span>
            </div>
          </div>
          {/* New Responses Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            newResponsesCount > 0
              ? 'bg-[#3BB253] text-white shadow-md'
              : 'bg-gray-200 text-gray-600'
          }`}>
            <svg
              className={`w-4 h-4 ${newResponsesCount > 0 ? 'animate-bounce' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium">
              {newResponsesCount} new response{newResponsesCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Summary Stat Cards - 3 KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Card 1 - Active Opportunities */}
          <button
            onClick={() => handleKpiCardClick('active')}
            className={`bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all text-left ${
              selectedKpiFilter === 'active'
                ? 'border-[#D32F2F] ring-2 ring-[#D32F2F]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center">
                  <p className="text-sm text-gray-500">Active Opportunities</p>
                  <InfoTooltip content="Total count of opportunities currently in 'active' status that have been sent to clients and are awaiting responses." />
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activeOppsCount}</p>
                <p className="text-xs text-[#D32F2F] mt-2 flex items-center gap-1">
                  <span>↗</span> +3 this week
                </p>
              </div>
              <div className="w-12 h-12 bg-[#D32F2F] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            {selectedKpiFilter === 'active' && (
              <div className="mt-2 text-xs text-[#D32F2F] font-medium">Filtering table</div>
            )}
          </button>

          {/* Card 2 - Accepted */}
          <button
            onClick={() => handleKpiCardClick('accepted')}
            className={`bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all text-left ${
              selectedKpiFilter === 'accepted'
                ? 'border-[#3BB253] ring-2 ring-[#3BB253]/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center">
                  <p className="text-sm text-gray-500">Accepted</p>
                  <InfoTooltip content="Total count of opportunities where at least one client has confirmed participation. These are your successful placements." />
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-1">{acceptedCount}</p>
                <div className="w-16 h-1.5 bg-[#3BB253] rounded-full mt-3"></div>
              </div>
              <div className="w-12 h-12 bg-[#3BB253] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {selectedKpiFilter === 'accepted' && (
              <div className="mt-2 text-xs text-[#3BB253] font-medium">Filtering table</div>
            )}
          </button>

          {/* Card 3 - Interested */}
          <button
            onClick={() => handleKpiCardClick('interested')}
            className={`bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all text-left ${
              selectedKpiFilter === 'interested'
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center">
                  <p className="text-sm text-gray-500">Interested</p>
                  <InfoTooltip content="Opportunities where clients have expressed interest but haven't confirmed yet. These are warm leads requiring follow-up." />
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-1">{interestedCount}</p>
                <div className="w-12 h-1.5 bg-purple-500 rounded-full mt-3"></div>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {selectedKpiFilter === 'interested' && (
              <div className="mt-2 text-xs text-purple-500 font-medium">Filtering table</div>
            )}
          </button>
        </div>

        {/* Filters - Compact */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-sm"
              />
            </div>

            {/* Client Filter */}
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-sm bg-white"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            {/* Client Response Filter */}
            <select
              value={selectedResponse}
              onChange={(e) => setSelectedResponse(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-sm bg-white"
            >
              <option value="">All Responses</option>
              {responseStates.map((state) => (
                <option key={state} value={state}>
                  {state.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Media Type Filter */}
            <select
              value={selectedMediaType}
              onChange={(e) => setSelectedMediaType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent text-sm bg-white"
            >
              <option value="">All Types</option>
              {mediaTypes.map((type: string) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(searchQuery || selectedClient || selectedResponse || selectedMediaType || selectedKpiFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClient('');
                  setSelectedResponse('');
                  setSelectedMediaType('');
                  setSelectedKpiFilter(null);
                }}
                className="px-3 py-2 text-xs text-[#D32F2F] hover:text-[#C62828] font-medium whitespace-nowrap"
              >
                Clear
              </button>
            )}

            {/* Results count */}
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {filteredOpportunities.length} results
            </span>
          </div>
        </div>

        {/* Main Content Grid - Fill remaining space */}
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0 overflow-auto">
          {/* Recent Opportunities - 2 columns */}
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Recent Opportunities</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
              <Link
                href="/agency/opportunities"
                className="text-xs text-[#D32F2F] hover:text-[#C62828] font-medium"
              >
                View All
              </Link>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Opportunity</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Outlet</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Deadline</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No opportunities found
                      </td>
                    </tr>
                  ) : (
                    recentOpportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{opp.title}</p>
                            {opp.media_type && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs mt-1">
                                {opp.media_type}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{opp.outlet_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {opp.deadline_at
                            ? new Date(opp.deadline_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            opp.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : opp.status === 'closed'
                              ? 'bg-purple-100 text-purple-700'
                              : opp.status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {opp.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tasks - 1 column */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Tasks</h2>
                <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  {tasks.filter((t: any) => t.status === 'pending').length}
                </span>
              </div>
              <Link
                href="/agency/tasks"
                className="text-xs text-[#D32F2F] hover:text-[#C62828] font-medium"
              >
                View All
              </Link>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-auto divide-y divide-gray-100">
              {recentTasks.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500 text-sm">No tasks yet</p>
                </div>
              ) : (
                recentTasks.map((task: any) => (
                  <div key={task.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          task.priority === 'high'
                            ? 'bg-red-500'
                            : task.priority === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                            task.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {task.status === 'in_progress' ? 'In Progress' : task.status}
                          </span>
                          {task.due_at && (
                            <span className="text-xs text-gray-500">
                              {new Date(task.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Performance & Operations Panel - Compact horizontal band */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm flex-shrink-0">
          {/* Single horizontal container with 3 zones */}
          <div className="flex divide-x divide-gray-200">
            {/* Zone 1: Client Engagement (Left) */}
            <div className="flex-1 px-5 py-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Client Engagement</div>
              <div className="flex items-center gap-6">
                {/* Response Rate */}
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="w-full bg-gray-600 rounded-full transition-all"
                      style={{ height: `${responseRate}%` }}
                    />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{responseRate}%</div>
                    <div className="text-xs text-gray-500">Response Rate</div>
                  </div>
                </div>
                {/* Avg Response Time */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold text-gray-900">{avgResponseTime}</span>
                      <span className="text-xs text-green-600">↑ 15%</span>
                    </div>
                    <div className="text-xs text-gray-500">Avg Response</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone 2: Pipeline Health (Center) */}
            <div className="flex-1 px-5 py-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pipeline Health</div>
              <div className="flex items-center gap-6">
                {/* Approaching Deadline */}
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-8 rounded-full ${approachingDeadlineCount > 0 ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{approachingDeadlineCount}</div>
                    <div className="text-xs text-gray-500">Due in 7 days</div>
                  </div>
                </div>
                {/* Unassigned */}
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-8 rounded-full ${unassignedCount > 0 ? 'bg-amber-300' : 'bg-gray-200'}`} />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{unassignedCount}</div>
                    <div className="text-xs text-gray-500">Unassigned</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone 3: Operational Load (Right) */}
            <div className="flex-1 px-5 py-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Operational Load</div>
              <div className="flex items-center gap-6">
                {/* Outstanding Questions */}
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-8 rounded-full ${escalatedChatsCount > 0 ? 'bg-red-400' : 'bg-gray-200'}`} />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{escalatedChatsCount}</div>
                    <div className="text-xs text-gray-500">Questions</div>
                  </div>
                </div>
                {/* Pending Restores */}
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-8 rounded-full ${pendingRestoreCount > 0 ? 'bg-red-400' : 'bg-gray-200'}`} />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{pendingRestoreCount}</div>
                    <div className="text-xs text-gray-500">Restores</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
