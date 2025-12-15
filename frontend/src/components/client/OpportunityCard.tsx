import React, { useState } from 'react';
import { Opportunity } from '@/lib/types';
import { RestoreRequestButton } from './RestoreRequestButton';

interface RestoreRequestInfo {
  id: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  responseState: 'pending' | 'interested' | 'accepted' | 'declined' | 'no_response';
  onStatusChange: (opportunityId: string, newStatus: 'interested' | 'accepted' | 'declined') => void;
  onAskQuestions: (opportunityId: string) => void;
  onContactAOPR: (opportunityId: string) => void;
  onRequestRestore?: (opportunityId: string) => void;
  showInlineChat?: boolean;
  chatComponent?: React.ReactNode;
  clientId?: string;
  existingRestoreRequest?: RestoreRequestInfo | null;
  onRestoreRequested?: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  responseState,
  onStatusChange,
  onAskQuestions,
  onContactAOPR,
  onRequestRestore,
  showInlineChat = false,
  chatComponent,
  clientId,
  existingRestoreRequest,
  onRestoreRequested,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format deadline date
  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const deadline = formatDeadline(opportunity.deadline_at);
  const isDeadlinePassed = opportunity.deadline_at && new Date(opportunity.deadline_at) < new Date();

  // Format media type for display
  const formatMediaType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'interested':
        return 'bg-blue-500 text-white';
      case 'accepted':
        return 'bg-[#3BB253] text-white';
      case 'declined':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get contextual message based on state
  const getContextualMessage = () => {
    switch (responseState) {
      case 'interested':
        return {
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          ),
          text: "You've expressed interest in this opportunity. Ask questions or accept when ready.",
        };
      case 'accepted':
        return {
          icon: (
            <svg className="w-5 h-5 text-[#3BB253]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          text: "You've accepted this opportunity. Contact your AOPR team for next steps.",
        };
      case 'declined':
        return {
          icon: (
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          text: "You declined this opportunity. If the deadline hasn't passed, you can request to restore it.",
        };
      default:
        return null;
    }
  };

  const contextualMessage = getContextualMessage();

  // Truncate summary for display
  const maxLength = 200;
  const shouldTruncate = opportunity.summary && opportunity.summary.length > maxLength;
  const displaySummary =
    shouldTruncate && !isExpanded
      ? opportunity.summary?.substring(0, maxLength) + '...'
      : opportunity.summary;

  // Combine outlet and title
  const displayTitle = opportunity.outlet_name
    ? `${opportunity.outlet_name}: ${opportunity.title}`
    : opportunity.title;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {/* Card header with gradient */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900">{displayTitle}</h3>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Opportunity type tag */}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded">
            {opportunity.opportunity_type || 'PR'}
          </span>
          {/* Status tag */}
          <span
            className={`px-3 py-1 text-sm font-medium rounded ${getStatusBadgeStyle(responseState)}`}
          >
            {responseState.charAt(0).toUpperCase() + responseState.slice(1)}
          </span>
        </div>
      </div>

      {/* Main card content */}
      <div className="p-6">
        {/* Summary */}
        {opportunity.summary && (
          <div className="mb-4">
            <p className="text-gray-700 text-sm leading-relaxed">{displaySummary}</p>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[#D32F2F] text-sm font-medium mt-2 hover:text-[#C62828] transition-colors"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Media Type & Deadline */}
        <div className="space-y-2">
          {opportunity.media_type && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium mr-2">Media Type:</span>
              <span>{formatMediaType(opportunity.media_type)}</span>
            </div>
          )}

          {deadline && (
            <div className="flex items-center text-sm">
              <svg
                className={`w-4 h-4 mr-2 ${isDeadlinePassed ? 'text-[#D32F2F]' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium mr-2">Deadline:</span>
              <span className={isDeadlinePassed ? 'text-[#D32F2F] font-medium' : 'text-[#D32F2F]'}>
                {deadline}
                {isDeadlinePassed && ' (Expired)'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons for pending state - CORRECT LABELS: Accept, Ask Questions, Decline */}
        {responseState === 'pending' && (
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => onStatusChange(opportunity.id, 'accepted')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#3BB253] to-[#339944] hover:from-[#339944] hover:to-[#2d8a3c] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Accept
            </button>
            <button
              onClick={() => {
                // Set status to "interested" AND open the chat
                onStatusChange(opportunity.id, 'interested');
                onAskQuestions(opportunity.id);
              }}
              className="px-5 py-2.5 border-2 border-[#D32F2F] text-[#D32F2F] hover:bg-[#D32F2F] hover:text-white text-sm font-medium rounded-lg transition-all duration-200"
            >
              Ask Questions
            </button>
            <button
              onClick={() => onStatusChange(opportunity.id, 'declined')}
              className="px-5 py-2.5 border-2 border-gray-400 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-all duration-200"
            >
              Decline
            </button>
          </div>
        )}
      </div>

      {/* Contextual action section for interested/accepted/declined states */}
      {contextualMessage && (
        <div className={`border-t px-6 py-4 ${
          responseState === 'declined'
            ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
            : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {contextualMessage.icon}
            <p className="text-sm text-gray-700">{contextualMessage.text}</p>
          </div>

          {responseState === 'interested' && (
            <button
              onClick={() => onStatusChange(opportunity.id, 'accepted')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3BB253] to-[#339944] hover:from-[#339944] hover:to-[#2d8a3c] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Accept Now
            </button>
          )}

          {responseState === 'accepted' && (
            <button
              onClick={() => onContactAOPR(opportunity.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D32F2F] to-[#C62828] hover:from-[#C62828] hover:to-[#B71C1C] text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Contact AOPR
            </button>
          )}

          {responseState === 'declined' && clientId && (
            <RestoreRequestButton
              opportunityId={opportunity.id}
              opportunityTitle={opportunity.title}
              clientId={clientId}
              hasDeadlinePassed={!!isDeadlinePassed}
              existingRestoreRequest={existingRestoreRequest}
              onRestoreRequested={onRestoreRequested}
            />
          )}
        </div>
      )}

      {/* Inline Q&A Chat (embedded in card) */}
      {showInlineChat && chatComponent && (
        <div className="border-t border-gray-200">{chatComponent}</div>
      )}
    </div>
  );
};
