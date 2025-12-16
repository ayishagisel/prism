'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * WebSocket events that can be received
 */
export type WebSocketEvent =
  | 'action_item:new'
  | 'action_item:updated'
  | 'chat:message'
  | 'chat:escalated'
  | 'restore:request'
  | 'restore:response'
  | 'notification:new'
  | 'status:updated'
  | 'opportunity:updated'
  | 'task:updated'
  | 'data:refresh';

/**
 * Connection status for WebSocket
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Event handler type
 */
type EventHandler = (data: any) => void;

/**
 * Hook return type
 */
interface UseSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (event: WebSocketEvent, handler: EventHandler) => () => void;
  emit: (event: string, data: any) => void;
}

/**
 * Get the WebSocket server URL from environment or default
 */
const getSocketUrl = (): string => {
  // In development, connect to backend
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  return 'http://localhost:3001';
};

/**
 * Custom hook for WebSocket connection management
 * Handles authentication, reconnection, and event subscription
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const handlersRef = useRef<Map<WebSocketEvent, Set<EventHandler>>>(new Map());

  /**
   * Initialize socket connection
   */
  useEffect(() => {
    // Only connect on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    // Create socket connection
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      setStatus('connected');
      console.log('WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      setStatus('error');
      console.error('WebSocket connection error:', error.message);
    });

    // Heartbeat to keep connection alive and update presence
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Subscribe to a WebSocket event
   * Returns an unsubscribe function
   */
  const subscribe = useCallback((event: WebSocketEvent, handler: EventHandler): (() => void) => {
    const socket = socketRef.current;

    // Add handler to our map
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);

    // Add listener to socket
    if (socket) {
      socket.on(event, handler);
    }

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(event)?.delete(handler);
      if (socket) {
        socket.off(event, handler);
      }
    };
  }, []);

  /**
   * Emit an event to the server
   */
  const emit = useCallback((event: string, data: any): void => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  return {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    subscribe,
    emit,
  };
}

/**
 * Hook for subscribing to specific WebSocket events
 * Automatically handles cleanup on unmount
 */
export function useSocketEvent(event: WebSocketEvent, handler: EventHandler): void {
  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
  }, [event, handler, subscribe]);
}
