'use client';

import React, { useState, useEffect } from 'react';
import { useOpportunities } from '@/lib/hooks';
import { OpportunitiesTable } from '@/components/agency/OpportunitiesTable';
import { NewOpportunityForm } from '@/components/agency/NewOpportunityForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { apiClient } from '@/lib/api';

export default function OpportunitiesPage() {
  const { opportunities, loading, refetch } = useOpportunities();
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique statuses and media types for filters
  const statuses = ['all', 'active', 'closed', 'paused', 'expired'];
  const mediaTypes = ['all', ...new Set(opportunities.map(o => o.media_type).filter(Boolean))];

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesStatus = statusFilter === 'all' || opp.status === statusFilter;
    const matchesMediaType = mediaTypeFilter === 'all' || opp.media_type === mediaTypeFilter;
    const matchesSearch = !searchQuery ||
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesMediaType && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: opportunities.length,
    active: opportunities.filter(o => o.status === 'active').length,
    closed: opportunities.filter(o => o.status === 'closed').length,
    expired: opportunities.filter(o => o.status === 'expired').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#D32F2F] to-[#C62828] bg-clip-text text-transparent">
              Opportunities
            </h1>
            <p className="text-gray-600 mt-1">Manage and track all PR opportunities</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCSV(!showCSV)}
              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
              data-testid="csv-upload-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              CSV Import
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#C62828] hover:from-[#C62828] hover:to-[#B71C1C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              data-testid="new-opportunity-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Opportunity
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.closed}</p>
                <p className="text-xs text-gray-500">Closed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs text-gray-500">Expired</p>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        {showForm && (
          <div className="mb-6">
            <NewOpportunityForm
              onCancel={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false);
                refetch();
              }}
            />
          </div>
        )}

        {showCSV && (
          <div className="mb-6">
            <CSVUploadForm
              onCancel={() => setShowCSV(false)}
              onSuccess={() => {
                setShowCSV(false);
                refetch();
              }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                />
              </div>
            </div>
            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent bg-white"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {/* Media Type Filter */}
            <div>
              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent bg-white"
              >
                {mediaTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Media Types' : type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredOpportunities.length}</span> of{' '}
            <span className="font-medium">{opportunities.length}</span> opportunities
          </p>
          {(statusFilter !== 'all' || mediaTypeFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setMediaTypeFilter('all');
                setSearchQuery('');
              }}
              className="text-sm text-[#D32F2F] hover:text-[#C62828] font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Opportunities Table */}
        <OpportunitiesTable opportunities={filteredOpportunities} data-testid="opportunities-table" />
      </div>
    </div>
  );
}

function CSVUploadForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [csvContent, setCSVContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [clientMapping, setClientMapping] = useState<any>(null);
  const [mappingLoading, setMappingLoading] = useState(true);

  // Fetch client mapping on mount
  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const res = await apiClient.getClientMapping();
        if (res.success) {
          setClientMapping(res.data || {});
        }
      } catch (err) {
        console.error('Failed to fetch client mapping:', err);
      } finally {
        setMappingLoading(false);
      }
    };
    fetchMapping();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!csvContent.trim()) {
        setMessage({ type: 'error', text: 'Please paste CSV content' });
        setLoading(false);
        return;
      }

      const res = await apiClient.importCSV(csvContent, clientMapping);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Import successful! Created ${res.data?.created || 0} opportunities, skipped ${res.data?.skipped || 0} rows.`,
        });
        setCSVContent('');
        setTimeout(() => onSuccess(), 1500);
      } else {
        setMessage({ type: 'error', text: res.error || 'Import failed' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const messageColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Import from CSV</h2>
          <p className="text-sm text-gray-500">Format: Title, Description, Outlet, Type, Category, Deadline, Client</p>
        </div>
      </div>

      {message && (
        <div className={`${messageColors[message.type]} p-3 rounded-lg mb-4 text-sm border`}>{message.text}</div>
      )}

      {mappingLoading ? (
        <div className="text-gray-600 text-sm mb-4">Loading client mapping...</div>
      ) : clientMapping && Object.keys(clientMapping).length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-700 border border-gray-200">
          <span className="font-medium">Recognized Clients:</span> {Object.keys(clientMapping).join(', ')}
        </div>
      )}

      <textarea
        value={csvContent}
        onChange={(e) => setCSVContent(e.target.value)}
        placeholder="Paste CSV content here..."
        rows={6}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent mb-4 font-mono text-sm resize-none"
      />
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || mappingLoading}
          className="px-4 py-2 bg-gradient-to-r from-[#D32F2F] to-[#C62828] hover:from-[#C62828] hover:to-[#B71C1C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import CSV'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
