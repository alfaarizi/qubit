import { default as useWebSocketLib, ReadyState } from 'react-use-websocket';
import { useCallback, useMemo, useEffect, useRef } from 'react';

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
        endpoint = '/ws/',
        onMessage,
        enabled = true,
        reconnectAttempts = 10,
    } = options;

    // Build WebSocket URL
    const socketUrl = useMemo(() => {
        if (!enabled) {
            return null;
        }
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const url = new URL(baseUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = url.host;
        const wsUrl = `${protocol}//${host}/api/v1${endpoint}`;
        return wsUrl;
    }, [endpoint, enabled]);

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocketLib(socketUrl, {
        shouldReconnect: () => {
            const should = enabled;
            return should;
        },
        reconnectAttempts: reconnectAttempts,
        reconnectInterval: (attempt) => Math.min(Math.pow(2, attempt) * 1_000, 30_000),
        onOpen: () => {
            // WebSocket connected
        },
        onError: () => {
            // WebSocket error
        },
        onClose: () => {
            // WebSocket closed
        }
    });

    const isConnected = readyState === ReadyState.OPEN;

    // Keep onMessage in a ref so we can call it without triggering effect re-runs
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Process messages from lastJsonMessage (react-use-websocket stores messages here)
    useEffect(() => {
        if (!lastJsonMessage) {
            return;
        }
        
        if (lastJsonMessage && typeof lastJsonMessage === 'object' && 'type' in lastJsonMessage) {
            if (onMessageRef.current) {
                onMessageRef.current(lastJsonMessage as WebSocketMessage);
            }
        }
    }, [lastJsonMessage]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (readyState === ReadyState.OPEN && message?.type) {
            try {
                sendJsonMessage(message);
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }, [readyState, sendJsonMessage]);

    const sendPing = useCallback(() => {
        sendMessage({ type: 'ping', timestamp: Date.now() })
    }, [sendMessage]);

    const joinRoom = useCallback((roomName: string) => {
        if (readyState === ReadyState.OPEN) {
            sendMessage({ type: 'join_room', room: roomName });
        }
    }, [readyState, sendMessage]);

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