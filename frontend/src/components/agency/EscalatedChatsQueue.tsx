import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';

interface EscalatedChat {
  chat_id: string;
  opportunity_id: string;
  opportunity_title: string;
  client_id: string;
  client_name: string;
  message: string;
  sender_type: string;
  created_at: string;
  escalated_to_user_id: string | null;
}

export const EscalatedChatsQueue: React.FC = () => {
  const [chats, setChats] = useState<EscalatedChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchEscalatedChats();
  }, []);

  const fetchEscalatedChats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getEscalatedChats();
      if (response.success && response.data) {
        setChats(response.data);
      } else {
        setError('Failed to load escalated chats');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load escalated chats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = (opportunityId: string, clientId: string) => {
    // Navigate to the chat interface for this opportunity and client
    router.push(`/opportunities/${opportunityId}/chat?clientId=${clientId}`);
  };

  const formatTimeSince = (createdAtStr: string) => {
    const date = new Date(createdAtStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getUrgencyBadge = (createdAtStr: string) => {
    const date = new Date(createdAtStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours >= 24) {
      return (
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          Urgent
        </span>
      );
    } else if (diffHours >= 4) {
      return (
        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
          High Priority
        </span>
      );
    } else {
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
          Normal
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Client Questions Needing Response</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Client Questions Needing Response</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Client Questions Needing Response</h2>
        <p className="text-gray-500 text-center py-8">
          No escalated chats requiring response
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Client Questions Needing Response</h2>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          {chats.length} unread
        </span>
      </div>

      <div className="space-y-4">
        {chats.map((chat) => (
          <div
            key={chat.chat_id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header: Client Name and Urgency */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{chat.client_name}</p>
                <p className="text-sm text-gray-500">
                  Escalated {formatTimeSince(chat.created_at)}
                </p>
              </div>
              {getUrgencyBadge(chat.created_at)}
            </div>

            {/* Opportunity Title */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <h3 className="font-semibold text-gray-900 mb-1">
                {chat.opportunity_title}
              </h3>
            </div>

            {/* Latest Question */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Latest Question:</p>
              <p className="text-sm text-gray-900 bg-blue-50 border border-blue-100 rounded p-2 line-clamp-3">
                {chat.message}
              </p>
            </div>

            {/* Respond Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => handleRespond(chat.opportunity_id, chat.client_id)}
                className="btn btn-primary px-4 py-2 text-sm font-medium"
              >
                Respond
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
