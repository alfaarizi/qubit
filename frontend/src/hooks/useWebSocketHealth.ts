import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { healthCheck } from '@/api/common/HealthService';

export type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'offline';

const STATUS_KEY = 'healthStatus';

export function useWebSocketHealth() {
    const ws = useWebSocket();
    const { isConnected, connectionState, sendPing } = ws;

    const [status, setStatus] = useState<HealthStatus>(
        (localStorage.getItem(STATUS_KEY) as HealthStatus) || 'loading'
    );
    const [httpHealthy, setHttpHealthy] = useState(false);
    const [httpChecked, setHttpChecked] = useState(false);

    const recheckHttp = useCallback(async () => {
        try {
            await healthCheck();
            setHttpHealthy(true);
        } catch {
            setHttpHealthy(false);
        } finally {
            setHttpChecked(true);
        }
    }, []);

    // Poll HTTP and send WS ping
    useEffect(() => {
        recheckHttp();
        const httpInterval = setInterval(recheckHttp, 30_000);
        const pingInterval = setInterval(() => {
            if (isConnected) sendPing();
        }, 30_000);
        return () => {
            clearInterval(httpInterval);
            clearInterval(pingInterval);
        };
    }, [isConnected, recheckHttp, sendPing]);

    // Compute status with tiny debounce and save to localStorage
    useEffect(() => {
        let nextStatus: HealthStatus;
        if (!httpChecked || connectionState === 'connecting') nextStatus = 'loading';
        else if (!httpHealthy && !isConnected) nextStatus = 'offline';
        else if (httpHealthy && isConnected)  nextStatus = 'healthy';
        else  nextStatus = 'degraded';

        if (status !== nextStatus) {
            const timeout = setTimeout(() => {
                setStatus(nextStatus);
                localStorage.setItem(STATUS_KEY, nextStatus);
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [httpChecked, httpHealthy, isConnected, connectionState, status]);

    return {
        status,
        isWebSocketConnected: isConnected,
        recheckHttp
    };
}
