'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabNavigation from '@/components/client/TabNavigation';
import { apiClient } from '@/lib/api';

type TabType = 'new' | 'interested' | 'accepted' | 'declined';

interface OpportunityWithStatus {
  id: string;
  title: string;
  summary: string;
  outlet_name: string;
  media_type: string;
  deadline_at: string;
  response_state: 'pending' | 'interested' | 'accepted' | 'declined' | 'no_response';
  notes_for_agency?: string;
  responded_at?: string;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [opportunities, setOpportunities] = useState<OpportunityWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  // Fetch opportunities on mount
  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user (client)
      const meResponse = await apiClient.getMe();
      if (!meResponse.success || !meResponse.data?.client_id) {
        throw new Error('Failed to get client information');
      }

      const currentClientId = meResponse.data.client_id;
      setClientId(currentClientId);

      // Get opportunities for this client
      const oppsResponse = await apiClient.getClientOpportunities(currentClientId);
      if (!oppsResponse.success) {
        throw new Error(oppsResponse.error || 'Failed to fetch opportunities');
      }

      setOpportunities(oppsResponse.data || []);
    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
      setError(err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Filter opportunities by response state
  const getFilteredOpportunities = (tab: TabType): OpportunityWithStatus[] => {
    const stateMap: Record<TabType, string[]> = {
      new: ['pending'],
      interested: ['interested'],
      accepted: ['accepted'],
      declined: ['declined'],
    };

    const states = stateMap[tab];
    return opportunities.filter((opp) => states.includes(opp.response_state));
  };

  // Calculate counts for each tab
  const counts = {
    new: opportunities.filter((opp) => opp.response_state === 'pending').length,
    interested: opportunities.filter((opp) => opp.response_state === 'interested').length,
    accepted: opportunities.filter((opp) => opp.response_state === 'accepted').length,
    declined: opportunities.filter((opp) => opp.response_state === 'declined').length,
  };

  // Get opportunities for the active tab
  const filteredOpportunities = getFilteredOpportunities(activeTab);

  // Handle "Ask Questions" button click - switch to interested tab
  const handleAskQuestions = (opportunityId: string) => {
    // This will be implemented when OpportunityCard is integrated
    setActiveTab('interested');
    // TODO: Update opportunity state to 'interested'
    // TODO: Navigate to chat or questions interface
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Media Opportunities</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review and respond to media opportunities from your PR agency
          </p>
        </div>

        {/* Alert Banner for New Opportunities */}
        {counts.new > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  You have{' '}
                  <span className="font-bold">{counts.new}</span> new{' '}
                  {counts.new === 1 ? 'opportunity' : 'opportunities'}!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-6 pt-6">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={counts}
            />
          </div>

          {/* Tab Content */}
          <div className="px-6 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchOpportunities}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} opportunities
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'new'
                    ? "You're all caught up! Check back later for new opportunities."
                    : `You don't have any ${activeTab} opportunities at the moment.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Placeholder for OpportunityCard components */}
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {opp.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {opp.outlet_name} • {opp.media_type}
                        </p>
                        {opp.summary && (
                          <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                            {opp.summary}
                          </p>
                        )}
                        {opp.deadline_at && (
                          <p className="text-sm text-gray-500">
                            Deadline:{' '}
                            {new Date(opp.deadline_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                      <span
                        className={`
                          ml-4 px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            opp.response_state === 'pending'
                              ? 'bg-red-100 text-red-700'
                              : opp.response_state === 'interested'
                              ? 'bg-blue-100 text-blue-700'
                              : opp.response_state === 'accepted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }
                        `}
                      >
                        {opp.response_state.charAt(0).toUpperCase() +
                          opp.response_state.slice(1)}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 italic">
                        Opportunity cards will go here
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
