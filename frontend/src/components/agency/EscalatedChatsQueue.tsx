'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

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

interface EscalatedChatsQueueProps {
  onChatSelect?: (opportunityId: string, clientId: string) => void;
}

export const EscalatedChatsQueue: React.FC<EscalatedChatsQueueProps> = ({
  onChatSelect,
}) => {
  const [chats, setChats] = useState<EscalatedChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEscalatedChats();
  }, []);

  const fetchEscalatedChats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getDashboardEscalatedChats();
      if (response.success) {
        setChats(response.data || []);
      } else {
        setError(response.error || 'Failed to load escalated chats');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load escalated chats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-sm font-bold text-gray-900">Escalated Q&A Chats</h3>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D32F2F] mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-sm font-bold text-gray-900">Escalated Q&A Chats</h3>
        </div>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">Escalated Q&A</h3>
            {chats.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            {chats.length} pending
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {chats.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No escalated chats</p>
            <p className="text-xs text-gray-400 mt-1">All client questions have been answered</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <div
                key={chat.chat_id}
                className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onChatSelect?.(chat.opportunity_id, chat.client_id)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.client_name}
                  </p>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatTimeAgo(chat.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2 truncate">
                  Re: {chat.opportunity_title}
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {truncateMessage(chat.message)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Needs Response
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {chats.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => window.location.href = '/agency/chats'}
            className="text-xs text-[#D32F2F] hover:text-[#C62828] font-medium"
          >
            View All Chats
          </button>
        </div>
      )}
    </div>
  );
};
