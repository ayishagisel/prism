import React from 'react';
import { Opportunity } from '@/lib/types';
import { StatusChip } from '@/components/common/StatusChip';
import { MediaTypeBadge } from '@/components/common/MediaTypeBadge';

interface OpportunityCardProps {
  opportunity: Opportunity;
  responseState: 'pending' | 'interested' | 'accepted' | 'declined' | 'no_response';
  onStatusChange: (opportunityId: string, newStatus: 'interested' | 'accepted' | 'declined') => void;
  onOpenChat: (opportunityId: string) => void;
  onRequestRestore?: (opportunityId: string) => void;
  hasUnreadMessages?: boolean;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  responseState,
  onStatusChange,
  onOpenChat,
  onRequestRestore,
  hasUnreadMessages = false,
}) => {
  // Format deadline date
  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    const now = new Date();
    const isPast = date < now;

    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return { formatted, isPast };
  };

  const deadline = formatDeadline(opportunity.deadline_at);
  const isDeadlinePassed = typeof deadline === 'object' && deadline.isPast;

  // Get opportunity type badge color
  const getOpportunityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PR: 'bg-purple-100 text-purple-800',
      Event: 'bg-blue-100 text-blue-800',
      Speaking: 'bg-orange-100 text-orange-800',
      Partnership: 'bg-teal-100 text-teal-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="card border border-gray-200">
      {/* Header with badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`status-badge ${getOpportunityTypeBadge(opportunity.opportunity_type)}`}>
            {opportunity.opportunity_type}
          </span>
          <MediaTypeBadge mediaType={opportunity.media_type} />
          <StatusChip status={responseState} />
        </div>
        {hasUnreadMessages && responseState === 'interested' && (
          <div className="flex items-center gap-1 text-sm text-red-600 font-semibold">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            New message
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{opportunity.title}</h3>

      {/* Outlet name */}
      {opportunity.outlet_name && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Outlet:</span> {opportunity.outlet_name}
        </p>
      )}

      {/* Description */}
      {opportunity.summary && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{opportunity.summary}</p>
      )}

      {/* Deadline */}
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span
          className={`text-sm ${
            isDeadlinePassed ? 'text-red-600 font-semibold' : 'text-gray-600'
          }`}
        >
          {typeof deadline === 'object' ? deadline.formatted : deadline}
          {isDeadlinePassed && ' (Expired)'}
        </span>
      </div>

      {/* Action buttons based on response state */}
      <div className="flex items-center gap-2 flex-wrap">
        {responseState === 'pending' && (
          <>
            <button
              onClick={() => onStatusChange(opportunity.id, 'accepted')}
              className="btn btn-success"
            >
              Accept
            </button>
            <button
              onClick={() => onOpenChat(opportunity.id)}
              className="btn btn-secondary"
            >
              Ask Questions
            </button>
            <button
              onClick={() => onStatusChange(opportunity.id, 'declined')}
              className="btn btn-secondary text-red-600 hover:bg-red-50"
            >
              Decline
            </button>
          </>
        )}

        {responseState === 'interested' && (
          <>
            <button
              onClick={() => onStatusChange(opportunity.id, 'accepted')}
              className="btn btn-success"
            >
              Accept Now
            </button>
            <button
              onClick={() => onOpenChat(opportunity.id)}
              className="btn btn-secondary relative"
            >
              {hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              )}
              View Chat
            </button>
          </>
        )}

        {responseState === 'accepted' && (
          <button
            onClick={() => onOpenChat(opportunity.id)}
            className="btn btn-primary"
          >
            Contact AOPR
          </button>
        )}

        {responseState === 'declined' && !isDeadlinePassed && onRequestRestore && (
          <button
            onClick={() => onRequestRestore(opportunity.id)}
            className="btn btn-secondary"
          >
            Request Restore
          </button>
        )}

        {responseState === 'declined' && isDeadlinePassed && (
          <p className="text-sm text-gray-500 italic">This opportunity has expired</p>
        )}
      </div>
    </div>
  );
};
