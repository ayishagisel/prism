'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TabNavigation from '@/components/client/TabNavigation';
import { OpportunityCard } from '@/components/client/OpportunityCard';
import { InlineQAChat } from '@/components/client/InlineQAChat';
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

  // Inline chat state - track which opportunity has chat open
  const [inlineChatOpportunityId, setInlineChatOpportunityId] = useState<string | null>(null);

  // Slide-out chat state (only for Contact AOPR on accepted)
  const [contactChatOpen, setContactChatOpen] = useState(false);
  const [contactChatOpportunityId, setContactChatOpportunityId] = useState<string | null>(null);
  const [contactChatOpportunityTitle, setContactChatOpportunityTitle] = useState<string>('');

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

  // Handle status change (Accept/Decline)
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

        // If moving to interested, show inline chat and switch tab
        if (newStatus === 'interested') {
          setInlineChatOpportunityId(opportunityId);
          setActiveTab('interested');
        }

        // If accepted, switch to accepted tab
        if (newStatus === 'accepted') {
          setInlineChatOpportunityId(null);
          setActiveTab('accepted');
        }
      } else {
        alert('Failed to update status: ' + (response.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  // Handle "Ask Questions" click - always shows inline chat
  const handleAskQuestions = (opportunityId: string) => {
    // Toggle inline chat for this opportunity
    setInlineChatOpportunityId(
      inlineChatOpportunityId === opportunityId ? null : opportunityId
    );
  };

  // Handle "Contact AOPR" click - opens slide-out for accepted opportunities
  const handleContactAOPR = (opportunityId: string) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) return;

    setContactChatOpportunityId(opportunityId);
    setContactChatOpportunityTitle(opp.title);
    setContactChatOpen(true);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title with gradient text */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#D32F2F] to-[#C62828] bg-clip-text text-transparent">
            Your Media Opportunities
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Notifications via email or PRISM app &bull; Use &quot;Accept&quot; or &quot;Ask Questions&quot; buttons
          </p>
        </div>

        {/* Notification Banner with glow effect */}
        {counts.new > 0 && (
          <div className="relative mb-6">
            {/* Glow/blur effect layer */}
            <div className="absolute inset-0 bg-[#D32F2F] rounded-xl blur-lg opacity-30 animate-pulse"></div>

            {/* Content */}
            <div className="relative bg-gradient-to-r from-[#D32F2F] to-[#C62828] text-white rounded-xl p-4 md:p-6 flex items-start gap-4 shadow-xl">
              {/* Animated bell icon */}
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  You have {counts.new} new {counts.new === 1 ? 'opportunity' : 'opportunities'}!
                </h2>
                <p className="text-red-100 text-sm mt-0.5">
                  Review and respond before the deadlines to secure your placement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - Full width grid style */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

        {/* Opportunities List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F] mx-auto mb-3"></div>
                <p className="text-gray-500">Loading opportunities...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#D32F2F]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-[#D32F2F] mb-4 font-medium">{error}</p>
              <button
                onClick={fetchOpportunities}
                className="px-6 py-2.5 bg-gradient-to-r from-[#D32F2F] to-[#C62828] text-white rounded-lg hover:from-[#C62828] hover:to-[#B71C1C] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Try Again
              </button>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No {activeTab === 'new' ? 'new' : activeTab} opportunities
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {activeTab === 'new'
                  ? "You're all caught up! Check back later for new media opportunities."
                  : `You don't have any ${activeTab} opportunities at the moment.`}
              </p>
            </div>
          ) : (
            filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                responseState={opp.response_state}
                onStatusChange={handleStatusChange}
                onAskQuestions={handleAskQuestions}
                onContactAOPR={handleContactAOPR}
                showInlineChat={inlineChatOpportunityId === opp.id}
                chatComponent={
                  inlineChatOpportunityId === opp.id ? (
                    <InlineQAChat
                      opportunityId={opp.id}
                      opportunityTitle={opp.title}
                      onClose={() => setInlineChatOpportunityId(null)}
                    />
                  ) : null
                }
                clientId={clientId || undefined}
                onRestoreRequested={fetchOpportunities}
              />
            ))
          )}
        </div>
      </div>

      {/* Contact AOPR Chat Panel (slide-out for accepted state) */}
      {contactChatOpen && contactChatOpportunityId && (
        <ContactAOPRChat
          opportunityId={contactChatOpportunityId}
          opportunityTitle={contactChatOpportunityTitle}
          isOpen={contactChatOpen}
          onClose={() => {
            setContactChatOpen(false);
            setContactChatOpportunityId(null);
          }}
        />
      )}
    </div>
  );
}
