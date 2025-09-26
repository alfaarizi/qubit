import { default as useWebSocketLib, ReadyState } from 'react-use-websocket';
import { useCallback, useMemo } from 'react';

export { ReadyState } from 'react-use-websocket';

export interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

interface UseWebSocketOptions {
    endpoint?: string;
    onMessage?: (message: WebSocketMessage) => void;
    enabled?: boolean;
    reconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        endpoint = '/api/v1/ws/',
        onMessage,
        enabled = true,
        reconnectAttempts = 10,
    } = options;

    // Build WebSocket URL
    const socketUrl = useMemo(() => {
        if (!enabled) return null;
        const url = new URL(import.meta.env.VITE_API_BASE_URL);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}${endpoint}`;
    }, [endpoint, enabled]);

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocketLib(socketUrl, {
        shouldReconnect: () => enabled,
        reconnectAttempts: reconnectAttempts,
        reconnectInterval: (attempt) => Math.min(Math.pow(2, attempt) * 1_000, 30_000),
        onMessage: onMessage ? (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message && typeof message === 'object' && message.type) {
                    onMessage(message);
                }
            } catch {
                console.warn(`Invalid WebSocket message received: ${event.data}`);
            }
        } : undefined,
        onError: (event) => {
            console.error(`WebSocket connection error: ${event}`);
        },
        onClose: (event) => {
            if (event.code !== 1_000) {
                console.warn(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`);
            }
        }
    });

    const isConnected = readyState === ReadyState.OPEN;

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (readyState === ReadyState.OPEN && message?.type) {
            try {
                sendJsonMessage(message);
                return true;
            } catch (error) {
                console.error(`Failed to send WebSocket message: ${error}`);
                return false;
            }
        }
        return false;
    }, [readyState, sendJsonMessage]);

    const sendPing = useCallback(() => {
        sendMessage({ type: 'ping', timestamp: Date.now() })
    }, [sendMessage]);

    const joinRoom = useCallback((roomName: string) => {
        sendMessage({ type: 'join_room', room: roomName })
    }, [sendMessage]);

    const leaveRoom = useCallback((roomName: string) => {
        sendMessage({ type: 'leave_room', room: roomName })
    }, [sendMessage]);

    return {
        // State
        isConnected,
        readyState,
        // Data
        lastMessage: lastJsonMessage as WebSocketMessage | null,
        // Actions
        sendMessage,
        sendPing,
        joinRoom,
        leaveRoom,
    };
}