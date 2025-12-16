'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

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

interface QAChatProps {
  opportunityId: string;
  opportunityTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QAChat: React.FC<QAChatProps> = ({
  opportunityId,
  opportunityTitle,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const response = await apiClient.getChatMessages(opportunityId);
      // Response is the direct backend response: { messages: [...] }
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
      const response = await apiClient.sendChatMessage(opportunityId, messageText);

      // Response is the direct backend response: { clientMessage: {...}, aiResponse?: {...} }
      // Add client message
      if (response && (response as any).clientMessage) {
        setMessages((prev) => [...prev, (response as any).clientMessage]);
      }

      // Add AI response if present
      if (response && (response as any).aiResponse) {
        setMessages((prev) => [...prev, (response as any).aiResponse]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
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

    if (isSystem) {
      return (
        <div key={msg.id} className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Message bubble */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-700">System</span>
            </div>
            <div className="px-4 py-2 rounded-lg max-w-md bg-amber-50 text-gray-900 border border-amber-200">
              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
            </div>
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
              : isAI
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isClient ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          ) : isAI ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Message bubble */}
        <div className={`flex-1 ${isClient ? 'flex flex-col items-end' : ''}`}>
          {/* Sender name and badge */}
          <div className={`flex items-center gap-2 mb-1 ${isClient ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-medium text-gray-700">
              {isClient ? 'You' : isAI ? 'AI Assistant' : 'AOPR Team'}
            </span>
            {isAI && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                AI-Assisted
              </span>
            )}
          </div>

          {/* Message content */}
          <div
            className={`px-4 py-2 rounded-lg max-w-md ${
              isClient
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200'
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

      {/* Chat panel sliding from right */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold truncate">{opportunityTitle}</h2>
            <p className="text-sm text-red-100">Ask questions about this opportunity</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-100 transition-colors flex-shrink-0"
            aria-label="Close chat"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
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
                  Ask a question about this opportunity and our AI assistant will help you!
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

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isSending}
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {inputMessage.length}/2000
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-10 w-10"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
