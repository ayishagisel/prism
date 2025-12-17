'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useSocket } from '@/lib/socket';

interface ChatMessage {
  id: string;
  messageType?: 'client_question' | 'ai_response' | 'aopr_response' | 'system_message';
  message_type?: 'client_question' | 'ai_response' | 'aopr_response' | 'system_message';
  senderType?: string;
  sender_type?: string;
  senderId?: string | null;
  sender_id?: string | null;
  message: string;
  isEscalated?: boolean;
  is_escalated?: boolean;
  metadata: any;
  createdAt?: string;
  created_at?: string;
}

interface AgencyChatModalProps {
  opportunityId: string;
  opportunityTitle: string;
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AgencyChatModal: React.FC<AgencyChatModalProps> = ({
  opportunityId,
  opportunityTitle,
  clientId,
  clientName,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribe, isConnected } = useSocket();

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback((data: any) => {
    if (data.opportunityId === opportunityId && data.message) {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.message.id);
        if (exists) return prev;
        return [...prev, data.message];
      });
    }
  }, [opportunityId]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isOpen) return;

    // Listen for new client messages on this chat
    const unsubscribe = subscribe('chat:message', handleIncomingMessage);
    return () => {
      unsubscribe();
    };
  }, [isOpen, subscribe, handleIncomingMessage]);

  // Fetch messages when chat opens
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, opportunityId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      // Use the agency-specific endpoint that accepts clientId
      const response = await apiClient.getChatMessagesForAgency(opportunityId, clientId);
      if (response && (response as any).messages) {
        setMessages((response as any).messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await apiClient.sendAOPRResponse(opportunityId, clientId, messageText);

      if (response.success && (response as any).data) {
        setMessages((prev) => [...prev, (response as any).data]);
      } else if ((response as any).message) {
        // Direct message object returned
        setMessages((prev) => [...prev, (response as any).message]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const messageType = msg.messageType || msg.message_type;
    const isClient = messageType === 'client_question';
    const isAI = messageType === 'ai_response';
    const isAOPR = messageType === 'aopr_response';
    const isSystem = messageType === 'system_message';

    // For agency view: Agency/AI messages on LEFT, Client messages on RIGHT
    const isAgencySide = isAOPR || isAI;

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center mb-4">
          <div className="px-4 py-2 rounded-lg bg-amber-50 text-gray-700 border border-amber-200 text-sm max-w-md text-center">
            {msg.message}
            <div className="text-xs text-gray-500 mt-1">
              {formatTimestamp(msg.createdAt || msg.created_at)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        className={`flex items-start gap-3 mb-4 ${isClient ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isClient
              ? 'bg-blue-100 text-blue-600'
              : isAOPR
              ? 'bg-red-600 text-white'
              : 'bg-purple-100 text-purple-600'
          }`}
        >
          {isClient ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          ) : isAOPR ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          )}
        </div>

        {/* Message bubble */}
        <div className={`flex-1 ${isClient ? 'flex flex-col items-end' : ''}`}>
          {/* Sender name and badge */}
          <div className={`flex items-center gap-2 mb-1 ${isClient ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium text-gray-700">
              {isClient ? clientName : isAOPR ? 'You' : 'AI Assistant'}
            </span>
            {isAI && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full font-medium">
                AI-Assisted
              </span>
            )}
          </div>

          {/* Message content */}
          <div
            className={`px-4 py-2.5 rounded-2xl max-w-md ${
              isClient
                ? 'bg-blue-100 text-gray-900 rounded-br-md'
                : isAOPR
                ? 'bg-red-600 text-white rounded-bl-md'
                : 'bg-purple-50 text-gray-900 border border-purple-200 rounded-bl-md'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isClient ? 'text-right' : ''}`}>
            {formatTimestamp(msg.createdAt || msg.created_at)}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Chat panel - positioned above the floating button */}
      <div className="fixed right-6 bottom-24 w-96 h-[450px] bg-white shadow-2xl z-50 flex flex-col rounded-lg overflow-hidden">
        {/* Header - compact */}
        <div className="bg-[#D32F2F] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 pr-3 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate">{clientName}</h2>
              {isConnected && (
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
              )}
            </div>
            <p className="text-xs text-red-100 truncate mt-0.5">Re: {opportunityTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-100 transition-colors flex-shrink-0"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages area - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
                <p className="text-sm text-gray-500">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-xs">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No messages yet</h3>
                <p className="text-xs text-gray-500">
                  Start the conversation with {clientName}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area - compact */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
              rows={2}
              disabled={isSending}
              maxLength={2000}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-10 w-10 flex-shrink-0"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AgencyChatModal;
