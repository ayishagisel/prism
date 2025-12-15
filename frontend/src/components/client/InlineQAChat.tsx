'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface ChatMessage {
  id: string;
  messageType: 'client_question' | 'ai_response' | 'aopr_response' | 'system_message';
  senderType: string;
  senderId: string | null;
  message: string;
  isEscalated: boolean;
  metadata: any;
  createdAt: string;
}

interface InlineQAChatProps {
  opportunityId: string;
  opportunityTitle: string;
  onClose: () => void;
}

export const InlineQAChat: React.FC<InlineQAChatProps> = ({
  opportunityId,
  opportunityTitle,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages on mount
  useEffect(() => {
    fetchMessages();
  }, [opportunityId]);

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

      if (response && (response as any).clientMessage) {
        setMessages((prev) => [...prev, (response as any).clientMessage]);
      }

      if (response && (response as any).aiResponse) {
        setMessages((prev) => [...prev, (response as any).aiResponse]);
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = (msg: ChatMessage) => {
    const isClient = msg.messageType === 'client_question';
    const isAI = msg.messageType === 'ai_response';
    const isSystem = msg.messageType === 'system_message';

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <div className="text-xs text-gray-500 italic">{msg.message}</div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-end gap-2 max-w-[80%] ${isClient ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isClient ? 'bg-red-100' : 'bg-red-600'
            }`}
          >
            {isClient ? (
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              </svg>
            )}
          </div>

          <div className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
            {/* AI badge */}
            {isAI && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full mb-1 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                AI-Assisted
              </span>
            )}

            {/* Message bubble */}
            <div
              className={`px-4 py-2.5 rounded-2xl ${
                isClient
                  ? 'bg-red-600 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-400 mt-1">{formatTimestamp(msg.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-cyan-50">
      {/* Chat Header */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <div>
            <h3 className="font-medium text-sm">Q&A Chat</h3>
            <p className="text-xs text-red-100 truncate max-w-[200px]">{opportunityTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-red-500 rounded transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div className="h-80 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-500 text-sm">
              <p className="font-medium mb-1">No messages yet</p>
              <p className="text-xs">Ask a question about this opportunity!</p>
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
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
            className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
