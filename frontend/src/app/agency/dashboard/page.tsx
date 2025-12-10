'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useOpportunities, useTasks, useClients } from '@/lib/hooks';
import { apiClient } from '@/lib/api';
import { DashboardKPIs } from '@/components/agency/DashboardKPIs';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusChip } from '@/components/common/StatusChip';
import ViewToggle from '@/components/demo/ViewToggle';

type ViewType = 'agency' | 'client';

export default function DashboardPage() {
  // View toggle state
  const [currentView, setCurrentView] = useState<ViewType>('agency');

  // Refresh triggers for data refetching
  const [oppRefresh, setOppRefresh] = useState(0);
  const [taskRefresh, setTaskRefresh] = useState(0);

  // Zoho integration state
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);

  const { opportunities, loading: oppLoading } = useOpportunities(oppRefresh);
  const { tasks, loading: tasksLoading } = useTasks(taskRefresh);
  const { clients } = useClients();

  // Client opportunities map for filtering
  const [clientOppMap, setClientOppMap] = useState<{ [clientId: string]: string[] }>({});

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedResponse, setSelectedResponse] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('');

  // Build client opportunities map for filtering
  useEffect(() => {
    const buildMap = async () => {
      const map: { [clientId: string]: string[] } = {};

      for (const client of clients) {
        try {
          const res = await apiClient.getClientOpportunities(client.id);
          if (res.success && res.data) {
            map[client.id] = res.data.map((status: any) => status.opportunity_id);
          }
        } catch (err) {
          // Silent fail for individual client
        }
      }

      setClientOppMap(map);
    };

    if (clients.length > 0) {
      buildMap();
    }
  }, [clients]);

  // Check Zoho connection status on mount
  useEffect(() => {
    const checkZohoStatus = async () => {
      setZohoLoading(true);
      try {
        const res = await apiClient.getZohoConnectionStatus();
        setZohoConnected(res.success && res.data?.connected);
      } catch (err) {
        setZohoConnected(false);
      } finally {
        setZohoLoading(false);
      }
    };

    checkZohoStatus();
  }, []);

  // Handle Zoho authorization
  const handleConnectToZoho = async () => {
    try {
      setZohoLoading(true);
      const res = await apiClient.getZohoAuthorizationUrl();
      if (res.success && res.data?.authorization_url) {
        // Redirect to Zoho authorization URL
        window.location.href = res.data.authorization_url;
      } else {
        alert('Failed to get authorization URL');
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to connect'}`);
    } finally {
      setZohoLoading(false);
    }
  };

  // Handle Zoho sync
  const handleSyncFromZoho = async () => {
    try {
      setSyncInProgress(true);
      const res = await apiClient.triggerZohoSync();
      if (res.success) {
        alert(
          `Sync successful!\n\n` +
          `Opportunities synced: ${res.data?.opportunities_synced || 0}\n` +
          `Clients synced: ${res.data?.clients_synced || 0}`
        );
        // Refresh opportunities and clients
        setOppRefresh((prev) => prev + 1);
      } else {
        alert(`Sync failed: ${res.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Sync failed'}`);
    } finally {
      setSyncInProgress(false);
    }
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
  const acceptedOppsCount = opportunities.filter((o) => o.status === 'accepted').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'pending').length;

  // Calculate response rate % (based on opportunities with responses)
  const oppWithResponses = opportunities.filter((o) => o.status && o.status !== 'pending');
  const responseRate =
    opportunities.length > 0
      ? Math.round((oppWithResponses.length / opportunities.length) * 100)
      : 0;

  // Filter opportunities based on search and dropdowns - MUST BE BEFORE CONDITIONAL RETURN
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Client filter - check if opportunity is assigned to selected client
      const matchesClient =
        !selectedClient ||
        (clientOppMap[selectedClient] && clientOppMap[selectedClient].includes(opp.id));

      // Response filter (based on status) - check if opportunity status matches filter
      // Note: Opportunities have a 'status' field, filter options are pending/interested/accepted/declined/no_response
      const matchesResponse =
        !selectedResponse ||
        opp.status?.toLowerCase() === selectedResponse?.toLowerCase();

      // Media type filter
      const matchesMediaType =
        !selectedMediaType ||
        opp.media_type === selectedMediaType;

      return matchesSearch && matchesClient && matchesResponse && matchesMediaType;
    });
  }, [opportunities, searchQuery, selectedClient, selectedResponse, selectedMediaType, clientOppMap]);

  const recentTasks = tasks.slice(0, 5);

  // Get unique media types from opportunities
  const mediaTypes = Array.from(new Set(opportunities.map((o) => o.media_type).filter(Boolean)));

  const kpis = [
    {
      label: 'Active Opportunities',
      value: activeOppsCount,
      icon: '📋',
      color: 'text-primary',
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      icon: '📊',
      color: 'text-blue-600',
    },
    {
      label: 'Accepted Opportunities',
      value: acceptedOppsCount,
      icon: '✅',
      color: 'text-success',
    },
    {
      label: 'Tasks Due Soon',
      value: pendingTasksCount,
      icon: '📌',
      color: 'text-purple-600',
    },
  ];

  if (oppLoading || tasksLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentView === 'agency' ? 'Agency Dashboard' : 'Your Media Opportunities'}
          </h1>
          <p className="text-gray-600">
            {currentView === 'agency'
              ? 'Overview of your PR opportunities and tasks'
              : 'Notifications via email or PRISM app • Use "Interested" or "Accept" buttons'
            }
          </p>
        </div>
        <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
      </div>

      {currentView === 'agency' ? (
        <AgencyView
          zohoConnected={zohoConnected}
          zohoLoading={zohoLoading}
          syncInProgress={syncInProgress}
          handleConnectToZoho={handleConnectToZoho}
          handleSyncFromZoho={handleSyncFromZoho}
          kpis={kpis}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          selectedResponse={selectedResponse}
          setSelectedResponse={setSelectedResponse}
          selectedMediaType={selectedMediaType}
          setSelectedMediaType={setSelectedMediaType}
          clients={clients}
          mediaTypes={mediaTypes}
          filteredOpportunities={filteredOpportunities}
          recentTasks={recentTasks}
        />
      ) : (
        <ClientView opportunities={opportunities} />
      )}
    </div>
  );
}

function AgencyView({
  zohoConnected,
  zohoLoading,
  syncInProgress,
  handleConnectToZoho,
  handleSyncFromZoho,
  kpis,
  searchQuery,
  setSearchQuery,
  selectedClient,
  setSelectedClient,
  selectedResponse,
  setSelectedResponse,
  selectedMediaType,
  setSelectedMediaType,
  clients,
  mediaTypes,
  filteredOpportunities,
  recentTasks,
}: any) {
  return (
    <>
      {/* Zoho Integration Section */}
      <div className="card mb-8 border-l-4 border-blue-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
              🔗 Zoho CRM Integration
            </h3>
            <p className="text-sm text-gray-600">
              {zohoConnected
                ? '✓ Connected - You can now sync your Zoho deals and accounts'
                : 'Connect to Zoho CRM to automatically sync deals and accounts'}
            </p>
          </div>
          <div className="flex gap-2">
            {!zohoConnected ? (
              <button
                onClick={handleConnectToZoho}
                disabled={zohoLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium whitespace-nowrap"
              >
                {zohoLoading ? 'Connecting...' : 'Connect to Zoho'}
              </button>
            ) : (
              <button
                onClick={handleSyncFromZoho}
                disabled={syncInProgress}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition text-sm font-medium whitespace-nowrap"
              >
                {syncInProgress ? 'Syncing...' : 'Sync from Zoho'}
              </button>
            )}
          </div>
        </div>
      </div>

      <DashboardKPIs kpis={kpis} />

      {/* Advanced Filters */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            🔍 Advanced Filters
          </h3>
          <span className="text-sm text-gray-600">
            {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-xl font-bold text-gray-900">Recent Opportunities</h2>
            <Link href="/agency/opportunities" className="text-primary hover:text-red-700 text-sm whitespace-nowrap">
              View All →
            </Link>
          </div>
          <OpportunitiesTable opportunities={filteredOpportunities.slice(0, 5)} />
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Tasks</h2>
            <Link href="/agency/tasks" className="text-primary hover:text-red-700 text-sm whitespace-nowrap">
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
    </>
  );
}

function ClientView({ opportunities }: { opportunities: any[] }) {
  const newOpps = opportunities.filter((o) => o.status === 'pending');
  const interestedOpps = opportunities.filter((o) => o.status === 'interested');
  const acceptedOpps = opportunities.filter((o) => o.status === 'accepted');
  const declinedOpps = opportunities.filter((o) => o.status === 'declined');

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {newOpps.length > 0 && (
        <div className="bg-red-500 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold">
                You have {newOpps.length} new opportunit{newOpps.length === 1 ? 'y' : 'ies'}!
              </p>
              <p className="text-sm">Review and respond before the deadlines to secure your placement.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          <button className="flex-1 px-6 py-3 text-sm font-medium text-red-600 border-b-2 border-red-600">
            New{' '}
            <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
              {newOpps.length}
            </span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Interested{' '}
            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
              {interestedOpps.length}
            </span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Accepted{' '}
            <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
              {acceptedOpps.length}
            </span>
          </button>
          <button className="flex-1 px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300">
            Declined{' '}
            <span className="ml-2 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
              {declinedOpps.length}
            </span>
          </button>
        </div>

        {/* Opportunity Cards Preview */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 italic">
            📝 Opportunity cards are being built in parallel by Instance 3
          </p>

          {/* Sample Client Opportunity Cards */}
          {newOpps.slice(0, 3).map((opp) => (
            <div key={opp.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      PR
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      New!
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{opp.summary || 'No summary available'}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>Media Type: {opp.media_type}</span>
                <span>
                  Deadline: {opp.deadline_at ? new Date(opp.deadline_at).toLocaleDateString() : 'TBD'}
                </span>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition">
                  ✓ Accept
                </button>
                <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition">
                  💬 Ask Questions
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                  Decline
                </button>
              </div>
            </div>
          ))}

          {newOpps.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-gray-600">No new opportunities at the moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Info about parallel build */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Instance 2 is building the full dashboard with interactive tabs,
          and Instance 3 is building detailed opportunity cards. These will be integrated soon!
        </p>
      </div>
    </div>
  );
}
