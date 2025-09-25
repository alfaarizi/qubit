// src/hooks/useWebSocketHealth.ts
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { healthCheck } from '@/api/common/HealthService';

type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'offline';

export function useWebSocketHealth() {
    const [httpHealthy, setHttpHealthy] = useState(false);
    const [status, setStatus] = useState<HealthStatus>('loading');

    const ws = useWebSocket();
    const { isConnected, connectionState, sendPing } = ws;

    // Calculate overall status
    useEffect(() => {
        if (isConnected && httpHealthy) {
            setStatus('healthy');
        } else if (isConnected || httpHealthy) {
            setStatus('degraded');
        } else if (connectionState === 'connecting') {
            setStatus('loading');
        } else {
            setStatus('offline');
        }
    }, [isConnected, connectionState, httpHealthy]);

    // Initial HTTP check
    useEffect(() => {
        healthCheck()
            .then(() => setHttpHealthy(true))
            .catch(() => setHttpHealthy(false));
    }, []);

    // Ping every 30s when connected
    useEffect(() => {
        if (!isConnected) return;
        const interval = setInterval(() => sendPing(), 30000);
        return () => clearInterval(interval);
    }, [isConnected, sendPing]);

    const recheckHttp = async () => {
        try {
            await healthCheck();
            setHttpHealthy(true);
        } catch {
            setHttpHealthy(false);
        }
    };

    return {
        status,
        isWebSocketConnected: ws.isConnected,
        recheckHttp,
    };
}