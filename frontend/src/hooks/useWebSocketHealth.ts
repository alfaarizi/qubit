import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'offline';

interface UseWebSocketHealthOptions {
    pingInterval?: number;
    enabled?: boolean;
}

export function useWebSocketHealth(options: UseWebSocketHealthOptions = {}) {
    const {
        pingInterval = 30_000,
        enabled = true
    } = options;

    const [lastPongTime, setLastPongTime] = useState<number | null>(null);

    const { isConnected, sendPing } = useWebSocket({
        enabled: enabled,
        onMessage: (message) => {
            if (message.type === 'pong') {
                setLastPongTime(Date.now());
            }
        }
    });

    useEffect(() => {
        if (!isConnected) return;
        sendPing(); // Send initial ping
        const intervalId = setInterval(sendPing, pingInterval);
        return () => clearInterval(intervalId);
    }, [isConnected, pingInterval, sendPing]);

    const status = useMemo<HealthStatus>(() => {
        if (!isConnected)
            return 'offline';
        if (lastPongTime === null)
            return 'loading';
        const timeSinceLastPong = Date.now() - lastPongTime;
        return timeSinceLastPong > pingInterval * 2 ? 'degraded' : 'healthy';
    }, [isConnected, lastPongTime, pingInterval]);

    const checkHealth = useCallback(() => {
        if (isConnected) {
            sendPing();
        }
    }, [isConnected, sendPing]);

    return {
        status,
        checkHealth
    };
}