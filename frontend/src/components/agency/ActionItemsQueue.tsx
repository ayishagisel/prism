'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { AgencyChatModal } from './AgencyChatModal';

/**
 * Action item types from the unified queue
 */
type ActionItemType = 'escalated_chat' | 'restore_request';

/**
 * Unified action item interface
 */
interface ActionItem {
  id: string;
  type: ActionItemType;
  created_at: string;
  client_name: string;
  client_id: string;
  client_user_id: string | null;
  client_user_name: string | null;
  opportunity_id: string;
  opportunity_title: string;
  summary: string;
  metadata: Record<string, any>;
}

/**
 * Props for ActionItemsQueue component
 */
interface ActionItemsQueueProps {
  onItemSelect?: (item: ActionItem) => void;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
  /** Compact mode hides inline response UI and opens modal directly on click */
  compactMode?: boolean;
}

/**
 * Unified Action Items Queue Component
 * Displays escalated Q&A chats and restore requests in a single queue
 * Supports real-time updates via WebSocket
 */
export function ActionItemsQueue({
  onItemSelect,
  maxItems = 10,
  showHeader = true,
  className = '',
  compactMode = false,
}: ActionItemsQueueProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<{ [key: string]: string }>({});
  const [selectedChat, setSelectedChat] = useState<ActionItem | null>(null);

  const { subscribe, isConnected } = useSocket();

  /**
   * Fetch action items from API
   */
  const fetchItems = useCallback(async () => {
    try {
      const response = await apiClient.getActionItems();
      if (response.success && response.data) {
        setItems(response.data.slice(0, maxItems));
        setError(null);
      } else {
        setError(response.error || 'Failed to load action items');
      }
    } catch (err) {
      setError('Failed to load action items');
      console.error('Error fetching action items:', err);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribeNew = subscribe('action_item:new', () => {
      fetchItems();
    });

    const unsubscribeUpdated = subscribe('action_item:updated', () => {
      fetchItems();
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdated();
    };
  }, [subscribe, fetchItems]);

  /**
   * Handle inline chat response for escalated chats
   */
  const handleSendResponse = async (item: ActionItem) => {
    const message = responseText[item.id];
    if (!message?.trim()) return;

    setProcessingId(item.id);
    try {
      const response = await apiClient.sendAOPRResponse(
        item.opportunity_id,
        item.client_id,
        message
      );

      if (response.success) {
        // Clear the response text and refresh items
        setResponseText((prev) => ({ ...prev, [item.id]: '' }));
        fetchItems();
      } else {
        setError(response.error || 'Failed to send response');
      }
    } catch (err) {
      setError('Failed to send response');
      console.error('Error sending response:', err);
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle approve restore request
   */
  const handleApprove = async (item: ActionItem) => {
    setProcessingId(item.id);
    try {
      const response = await apiClient.approveRestoreRequest(item.id);
      if (response.id || response.success) {
        fetchItems();
      } else {
        setError(response.error || 'Failed to approve request');
      }
    } catch (err) {
      setError('Failed to approve request');
      console.error('Error approving request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle deny restore request
   */
  const handleDeny = async (item: ActionItem) => {
    setProcessingId(item.id);
    try {
      const response = await apiClient.denyRestoreRequest(item.id);
      if (response.id || response.success) {
        fetchItems();
      } else {
        setError(response.error || 'Failed to deny request');
      }
    } catch (err) {
      setError('Failed to deny request');
      console.error('Error denying request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Format relative time
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  /**
   * Get icon for item type
   */
  const getItemIcon = (type: ActionItemType): string => {
    return type === 'escalated_chat' ? '💬' : '🔄';
  };

  /**
   * Get type label
   */
  const getTypeLabel = (type: ActionItemType): string => {
    return type === 'escalated_chat' ? 'Escalated Chat' : 'Restore Request';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Action Items</h3>
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Action Items</h3>
            {items.length > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          {isConnected && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">✅</div>
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No pending action items</p>
        </div>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 hover:bg-gray-50 transition ${
                processingId === item.id ? 'opacity-60' : ''
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getItemIcon(item.type)}</span>
                  <div>
                    <span className="font-semibold text-sm">{item.client_name}</span>
                    {item.client_user_name && (
                      <span className="text-gray-500 text-sm"> ({item.client_user_name})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      item.type === 'escalated_chat'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {getTypeLabel(item.type)}
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(item.created_at)}</span>
                </div>
              </div>

              {/* Opportunity title */}
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Re: </span>
                <button
                  onClick={() => onItemSelect?.(item)}
                  className="text-red-600 hover:underline"
                >
                  {item.opportunity_title}
                </button>
              </div>

              {/* Summary/Message preview */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.summary}</p>

              {/* Actions based on type and mode */}
              {item.type === 'escalated_chat' ? (
                compactMode ? (
                  /* Compact mode: single button to open modal */
                  <button
                    onClick={() => setSelectedChat(item)}
                    className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <span>Respond to Chat</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                ) : (
                  /* Full mode: inline textarea + buttons */
                  <div className="space-y-2">
                    <textarea
                      value={responseText[item.id] || ''}
                      onChange={(e) =>
                        setResponseText((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Type your response..."
                      className="w-full p-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={2}
                      disabled={processingId === item.id}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendResponse(item)}
                        disabled={!responseText[item.id]?.trim() || processingId === item.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === item.id ? 'Sending...' : 'Send Response'}
                      </button>
                      <button
                        onClick={() => setSelectedChat(item)}
                        className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                      >
                        View Full Chat
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.id}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingId === item.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleDeny(item)}
                    disabled={processingId === item.id}
                    className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => onItemSelect?.(item)}
                    className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Agency Chat Modal */}
      {selectedChat && selectedChat.type === 'escalated_chat' && (
        <AgencyChatModal
          opportunityId={selectedChat.opportunity_id}
          opportunityTitle={selectedChat.opportunity_title}
          clientId={selectedChat.client_id}
          clientName={selectedChat.client_name}
          isOpen={true}
          onClose={() => {
            setSelectedChat(null);
            fetchItems(); // Refresh items after closing chat
          }}
        />
      )}
    </div>
  );
}

export default ActionItemsQueue;
