import { useEffect, useState, useRef, useCallback } from 'react';
import { useWebSocket, type WebSocketMessage } from './useWebSocket';

export interface PartitionUpdate {
    type: 'phase' | 'log' | 'complete' | 'error';
    phase?: string;
    message?: string;
    progress?: number;
    result?: Record<string, unknown>;
    timestamp?: number;
}

export const usePartition = (jobId: string | null) => {
    const [updates, setUpdates] = useState<PartitionUpdate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const roomJoinedRef = useRef(false);
    const currentJobIdRef = useRef<string | null>(null);

    // Memoize the message handler to prevent infinite loops
    const handleMessage = useCallback((message: WebSocketMessage) => {
        if (['phase', 'log', 'complete', 'error'].includes(message.type)) {
            const updateWithTimestamp = {
                ...message,
                timestamp: Date.now()
            } as PartitionUpdate;
            setUpdates((prev) => [...prev, updateWithTimestamp]);
        }
    }, []);

    // Always keep WebSocket enabled
    const { isConnected, joinRoom, readyState } = useWebSocket({
        enabled: true,
        onMessage: handleMessage,
    });

    // Handle jobId changes
    useEffect(() => {
        if (!jobId) {
            setUpdates([]);
            setError(null);
            roomJoinedRef.current = false;
            currentJobIdRef.current = null;
            return;
        }
        
        // New jobId
        if (jobId !== currentJobIdRef.current) {
            currentJobIdRef.current = jobId;
            roomJoinedRef.current = false; // Reset for new job
            setUpdates([]);
            setError(null);
        }
    }, [jobId]);

    // Join room once WebSocket is actually OPEN
    useEffect(() => {
        if (!jobId) return;
        
        if (isConnected && !roomJoinedRef.current) {
            roomJoinedRef.current = true;
            joinRoom(`partition-${jobId}`);
        }
    }, [jobId, isConnected, readyState, joinRoom]);

    return {
        updates,
        isConnected,
        error,
        clearProgress: () => {
            setUpdates([]);
            setError(null);
        },
    };
};