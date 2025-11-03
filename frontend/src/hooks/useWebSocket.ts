import { default as useWebSocketLib, ReadyState } from 'react-use-websocket';
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { broadcastMessage } from './useMessageBus';
import type { Message } from './useMessageBus';

export { ReadyState } from 'react-use-websocket';

interface UseWebSocketOptions {
    endpoint?: string;
    onMessage?: (message: Message) => void;
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

    const socketUrl = useMemo(() => {
        if (!enabled) {
            return null;
        }
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const url = new URL(baseUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = url.host;
        return `${protocol}//${host}/api/v1${endpoint}`;
    }, [endpoint, enabled]);

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocketLib(socketUrl, {
        shouldReconnect: () => enabled,
        reconnectAttempts,
        reconnectInterval: (attempt) => Math.min(Math.pow(2, attempt) * 1_000, 30_000),
    });

    const isConnected = readyState === ReadyState.OPEN;

    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!lastJsonMessage) {
            return;
        }
        const msg = lastJsonMessage as Message;
        console.log(`[WebSocket] New message from server:`, msg);
        if (lastJsonMessage && typeof lastJsonMessage === 'object' && 'type' in lastJsonMessage) {
            broadcastMessage(lastJsonMessage as Message);
            if (onMessageRef.current) {
                onMessageRef.current(lastJsonMessage as Message);
            }
        }
    }, [lastJsonMessage]);

    const sendMessage = useCallback((message: Message) => {
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
        sendMessage({ type: 'ping', timestamp: Date.now() });
    }, [sendMessage]);

    const joinRoom = useCallback((roomName: string, jobId?: string) => {
        if (readyState === ReadyState.OPEN) {
            sendMessage({ type: 'join_room', room: roomName, jobId });
        }
    }, [readyState, sendMessage]);

    const leaveRoom = useCallback((roomName: string, jobId?: string) => {
        sendMessage({ type: 'leave_room', room: roomName, jobId });
    }, [sendMessage]);

    return {
        isConnected,
        readyState,
        lastMessage: lastJsonMessage as Message | null,
        sendMessage,
        sendPing,
        joinRoom,
        leaveRoom,
    };
}