import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { healthCheck } from '@/api/common/HealthService';

export type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'offline';

export function useWebSocketHealth() {
    const [httpHealthy, setHttpHealthy] = useState(false);
    const [status, setStatus] = useState<HealthStatus>('loading');

    const ws = useWebSocket();
    const { isConnected, connectionState, sendPing } = ws;

    const recheckHttp = useCallback(async () => {
        try {
            await healthCheck();
            setHttpHealthy(true);
        } catch {
            setHttpHealthy(false);
        }
    }, []);

    // Initial check + polling + ping
    useEffect(() => {
        recheckHttp();
        const httpInterval = setInterval(recheckHttp, 30000);
        const pingInterval= isConnected ? setInterval(() => sendPing(), 30000) : null;
        return () => {
            clearInterval(httpInterval);
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [isConnected, recheckHttp, sendPing]);

    // Compute status with smoothing
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;

        let nextStatus: HealthStatus;
        if (!httpHealthy && connectionState === 'connecting') nextStatus = 'loading';
        else if (!httpHealthy && !isConnected) nextStatus = 'offline';
        else if (httpHealthy && isConnected) nextStatus = 'healthy';
        else nextStatus = 'degraded';

        if (status !== nextStatus) {
            timeout = setTimeout(() => setStatus(nextStatus), 300);
        }
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [httpHealthy, isConnected, connectionState, status]);

    return {
        status,
        isWebSocketConnected: isConnected,
        recheckHttp,
    };
}