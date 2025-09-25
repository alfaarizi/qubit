import { default as useWebSocketLib, ReadyState } from 'react-use-websocket';
import { useCallback } from 'react';

export type WebSocketConnection = 'connecting'  | 'connected' | 'closing' | 'disconnected' | 'uninstantiated';

export interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

interface UseWebSocketOptions {
    endpoint?: string;
    onMessage?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { endpoint = '/api/v1/ws/', onMessage } = options;

    // Build WebSocket URL
    const wsUrl = (() => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        return baseUrl.replace(/^https?/, 'ws') + endpoint;
    })();

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocketLib(wsUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: (attempt) => Math.min(Math.pow(2, attempt) * 1000, 30000),
        onMessage: onMessage ? (event) => {
            try {
                const message = JSON.parse(event.data);
                onMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        } : undefined,
    });

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (readyState === ReadyState.OPEN) {
            sendJsonMessage(message);
            return true;
        }
        return false;
    }, [readyState, sendJsonMessage]);

    const sendPing = useCallback(() =>
            sendMessage({ type: 'ping', timestamp: Date.now() })
        , [sendMessage]);

    return {
        sendMessage,
        sendPing,
        lastMessage: lastJsonMessage as WebSocketMessage | null,
        isConnected: readyState === ReadyState.OPEN,
        connectionState: {
            [ReadyState.CONNECTING]: 'connecting',
            [ReadyState.OPEN]: 'connected',
            [ReadyState.CLOSING]: 'closing',
            [ReadyState.CLOSED]: 'disconnected',
            [ReadyState.UNINSTANTIATED]: 'uninstantiated',
        }[readyState] as WebSocketConnection,
    };
}