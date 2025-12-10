import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { MediaTypeBadge } from '@/components/common/MediaTypeBadge';

interface RestoreRequest {
  request: {
    id: string;
    opportunity_id: string;
    client_id: string;
    client_user_id: string;
    status: 'pending' | 'approved' | 'denied';
    requested_at: string;
    created_at: string;
    updated_at: string;
  };
  opportunity: {
    id: string;
    title: string;
    media_type: string;
    outlet_name: string;
    deadline_at: string;
    summary: string;
  };
  client: {
    id: string;
    name: string;
  };
  clientUser: {
    id: string;
    name: string;
    email: string;
  };
}

export const RestoreRequestQueue: React.FC = () => {
  const [requests, setRequests] = useState<RestoreRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const { user } = useAuth();

  useEffect(() => {
    fetchRestoreRequests();
  }, []);

  const fetchRestoreRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getPendingRestoreRequests();
      setRequests(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load restore requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await apiClient.approveRestoreRequest(requestId, {
        review_notes: reviewNotes[requestId] || undefined,
      });

      // Refresh the list
      await fetchRestoreRequests();

      // Clear the review notes for this request
      setReviewNotes((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await apiClient.denyRestoreRequest(requestId, {
        review_notes: reviewNotes[requestId] || undefined,
      });

      // Refresh the list
      await fetchRestoreRequests();

      // Clear the review notes for this request
      setReviewNotes((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deny request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const formatDeadline = (deadlineStr: string) => {
    const date = new Date(deadlineStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRequestedAt = (requestedStr: string) => {
    const date = new Date(requestedStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Restore Requests</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Restore Requests</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Restore Requests</h2>
        <p className="text-gray-500 text-center py-8">
          No pending restore requests
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Restore Requests</h2>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          {requests.length} pending
        </span>
      </div>

      <div className="space-y-4">
        {requests.map((item) => (
          <div
            key={item.request.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header: Client and Requested Time */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{item.client.name}</p>
                <p className="text-sm text-gray-500">
                  Requested by {item.clientUser.name} • {formatRequestedAt(item.request.requested_at)}
                </p>
              </div>
            </div>

            {/* Opportunity Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <MediaTypeBadge mediaType={item.opportunity.media_type} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {item.opportunity.title}
              </h3>
              {item.opportunity.outlet_name && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Outlet:</span> {item.opportunity.outlet_name}
                </p>
              )}
              {item.opportunity.summary && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                  {item.opportunity.summary}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4"
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
                <span>Deadline: {formatDeadline(item.opportunity.deadline_at)}</span>
              </div>
            </div>

            {/* Review Notes (Optional) */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes[item.request.id] || ''}
                onChange={(e) =>
                  setReviewNotes((prev) => ({
                    ...prev,
                    [item.request.id]: e.target.value,
                  }))
                }
                placeholder="Add any notes about your decision..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                disabled={processingRequestId === item.request.id}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(item.request.id)}
                disabled={processingRequestId === item.request.id}
                className="btn btn-success flex-1 disabled:opacity-50"
              >
                {processingRequestId === item.request.id ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleDeny(item.request.id)}
                disabled={processingRequestId === item.request.id}
                className="btn btn-secondary flex-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {processingRequestId === item.request.id ? 'Processing...' : 'Deny'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
