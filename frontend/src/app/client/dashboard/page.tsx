'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabNavigation from '@/components/client/TabNavigation';
import { OpportunityCard } from '@/components/client/OpportunityCard';
import { QAChat } from '@/components/client/QAChat';
import { ContactAOPRChat } from '@/components/client/ContactAOPRChat';
import { RestoreRequestButton } from '@/components/client/RestoreRequestButton';
import { apiClient } from '@/lib/api';
import { Opportunity } from '@/lib/types';

type TabType = 'new' | 'interested' | 'accepted' | 'declined';

interface OpportunityWithStatus extends Opportunity {
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatOpportunityId, setChatOpportunityId] = useState<string | null>(null);
  const [chatOpportunityTitle, setChatOpportunityTitle] = useState<string>('');
  const [chatType, setChatType] = useState<'qa' | 'contact'>('qa');

  // Restore request state
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreOpportunityId, setRestoreOpportunityId] = useState<string | null>(null);
  const [pendingRestoreRequests, setPendingRestoreRequests] = useState<Set<string>>(new Set());

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

  // Handle status change (Accept/Decline/Interested)
  const handleStatusChange = async (
    opportunityId: string,
    newStatus: 'interested' | 'accepted' | 'declined'
  ) => {
    if (!clientId) return;

    try {
      const response = await apiClient.updateOpportunityStatus(clientId, opportunityId, {
        response_state: newStatus,
        responded_at: new Date().toISOString(),
      });

      if (response.success) {
        // Update local state
        setOpportunities((prev) =>
          prev.map((opp) =>
            opp.id === opportunityId ? { ...opp, response_state: newStatus } : opp
          )
        );

        // If moving to interested, open chat
        if (newStatus === 'interested') {
          const opp = opportunities.find((o) => o.id === opportunityId);
          if (opp) {
            handleOpenChat(opportunityId, 'qa');
          }
        }
      } else {
        alert('Failed to update status: ' + (response.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  // Handle opening chat
  const handleOpenChat = (opportunityId: string, type: 'qa' | 'contact' = 'qa') => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (opp) {
      setChatOpportunityId(opportunityId);
      setChatOpportunityTitle(opp.title);
      setChatType(type);
      setChatOpen(true);
    }
  };

  // Handle restore request
  const handleRequestRestore = async (opportunityId: string) => {
    if (!clientId) return;

    try {
      const response = await apiClient.createRestoreRequest({
        opportunity_id: opportunityId,
        client_id: clientId,
      });

      if (response.success) {
        setPendingRestoreRequests((prev) => new Set([...prev, opportunityId]));
        alert('Restore request submitted! Your agency will review it shortly.');
      } else {
        alert('Failed to submit restore request: ' + (response.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error creating restore request:', err);
      alert('Failed to submit restore request');
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
                  {counts.new === 1 ? 'opportunity' : 'opportunities'} awaiting your response!
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchOpportunities}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                  No {activeTab === 'new' ? 'new' : activeTab} opportunities
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'new'
                    ? "You're all caught up! Check back later for new opportunities."
                    : `You don't have any ${activeTab} opportunities at the moment.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    responseState={opp.response_state}
                    onStatusChange={handleStatusChange}
                    onOpenChat={(id) => {
                      // Use contact chat for accepted, Q&A chat for others
                      const type = opp.response_state === 'accepted' ? 'contact' : 'qa';
                      handleOpenChat(id, type);
                    }}
                    onRequestRestore={
                      opp.response_state === 'declined' && !pendingRestoreRequests.has(opp.id)
                        ? handleRequestRestore
                        : undefined
                    }
                    hasUnreadMessages={false} // TODO: Track unread messages
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div
            className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
              activeTab === 'new' ? 'ring-2 ring-red-500' : 'hover:shadow-md'
            }`}
            onClick={() => setActiveTab('new')}
          >
            <div className="text-2xl font-bold text-red-600">{counts.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
              activeTab === 'interested' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
            onClick={() => setActiveTab('interested')}
          >
            <div className="text-2xl font-bold text-blue-600">{counts.interested}</div>
            <div className="text-sm text-gray-600">Interested</div>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
              activeTab === 'accepted' ? 'ring-2 ring-green-500' : 'hover:shadow-md'
            }`}
            onClick={() => setActiveTab('accepted')}
          >
            <div className="text-2xl font-bold text-green-600">{counts.accepted}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div
            className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-all ${
              activeTab === 'declined' ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
            }`}
            onClick={() => setActiveTab('declined')}
          >
            <div className="text-2xl font-bold text-purple-600">{counts.declined}</div>
            <div className="text-sm text-gray-600">Declined</div>
          </div>
        </div>
      </div>

      {/* Q&A Chat Panel */}
      {chatOpen && chatType === 'qa' && chatOpportunityId && (
        <QAChat
          opportunityId={chatOpportunityId}
          opportunityTitle={chatOpportunityTitle}
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatOpportunityId(null);
          }}
        />
      )}

      {/* Contact AOPR Chat Panel */}
      {chatOpen && chatType === 'contact' && chatOpportunityId && (
        <ContactAOPRChat
          opportunityId={chatOpportunityId}
          opportunityTitle={chatOpportunityTitle}
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatOpportunityId(null);
          }}
        />
      )}
    </div>
  );
}
