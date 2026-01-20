import { useCallback, useEffect, useMemo, useRef } from 'react';
import { default as useWebSocketLib, ReadyState } from 'react-use-websocket';

import { broadcastMessage } from './useMessageBus';
import type { Message } from './useMessageBus';

export { ReadyState } from 'react-use-websocket';

interface UseWebSocketOptions {
    endpoint?: string;
    onMessage?: (message: Message) => void;
    enabled?: boolean;
    reconnectAttempts?: number;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    readyState: ReadyState;
    lastMessage: Message | null;
    sendMessage: (message: Message) => boolean;
    sendPing: () => void;
    joinRoom: (roomName: string, jobId?: string) => Promise<void>;
    leaveRoom: (roomName: string, jobId?: string) => void;
}

function buildSocketUrl(endpoint: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const url = new URL(baseUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    let token = '';
    try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            const { state } = JSON.parse(authStorage);
            token = state?.accessToken || '';
        }
    } catch {
        console.error('Failed to parse auth storage');
    }

    const wsUrl = `${protocol}//${url.host}/api/v1${endpoint}`;
    return token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        endpoint = '/ws/',
        onMessage,
        enabled = true,
        reconnectAttempts = 10,
    } = options;

    const socketUrl = useMemo(() => enabled ? buildSocketUrl(endpoint) : null, [endpoint, enabled]);
    const onMessageRef = useRef(onMessage);

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocketLib(socketUrl, {
        shouldReconnect: () => enabled,
        reconnectAttempts,
        reconnectInterval: (attempt) => Math.min(Math.pow(2, attempt) * 1000, 30000),
    });

    const isConnected = readyState === ReadyState.OPEN;

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (!lastJsonMessage || typeof lastJsonMessage !== 'object' || !('type' in lastJsonMessage)) {
            return;
        }
        const message = lastJsonMessage as Message;
        broadcastMessage(message);
        onMessageRef.current?.(message);
    }, [lastJsonMessage]);

    const sendMessage = useCallback((message: Message): boolean => {
        if (readyState !== ReadyState.OPEN || !message?.type) {
            return false;
        }
        try {
            sendJsonMessage(message);
            return true;
        } catch {
            return false;
        }
    }, [readyState, sendJsonMessage]);

    const sendPing = useCallback(() => {
        sendMessage({ type: 'ping', timestamp: Date.now() });
    }, [sendMessage]);

    const joinRoom = useCallback(async (roomName: string, jobId?: string): Promise<void> => {
        if (readyState !== ReadyState.OPEN) {
            throw new Error('WebSocket not connected');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message-bus', handler);
                reject(new Error('Room join timeout'));
            }, 5000);

            const handler = (event: Event) => {
                const message = (event as CustomEvent<Message>).detail;
                if (message.type === 'room_joined' && message.room === roomName) {
                    clearTimeout(timeout);
                    window.removeEventListener('message-bus', handler);
                    resolve();
                }
            };

            window.addEventListener('message-bus', handler);
            sendMessage({ type: 'join_room', room: roomName, job_id: jobId });
        });
    }, [readyState, sendMessage]);

    const leaveRoom = useCallback((roomName: string, jobId?: string): void => {
        sendMessage({ type: 'leave_room', room: roomName, job_id: jobId });
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
