import { useEffect, useRef } from 'react';
import { usePartitionStore } from '@/stores/partitionStore';

type MessageListener = (message: any) => void;
const messageListeners = new Set<MessageListener>();

export function addPartitionMessageListener(listener: MessageListener) {
    messageListeners.add(listener);
    return () => {
        messageListeners.delete(listener);
    };
}

export function broadcastPartitionMessage(message: any) {
    const jobId = message.job_id;
    const type = message.type;

    if (!jobId || !type) return;

    const store = usePartitionStore.getState();

    if (type === 'error') {
        store.setJobError(jobId, message.message || 'Unknown error');
    } else if (['phase', 'log', 'complete'].includes(type)) {
        const update = {
            type,
            phase: message.phase,
            message: message.message,
            progress: message.progress,
            result: message.result,
            timestamp: Date.now()
        }; 
        store.addUpdate(jobId, update);
        if (type === 'complete') {
            store.completeJob(jobId);
        }
    }

    messageListeners.forEach(listener => {
        try {
            listener(message);
        } catch (error) {
            console.error('Error in partition message listener:', error);
        }
    });
}

export function usePartitionMessageListener(onMessage: (message: any) => void) {
    const listenerRef = useRef(onMessage);
    
    useEffect(() => {
        listenerRef.current = onMessage;
    }, [onMessage]);
    
    useEffect(() => {
        const stableListener = (message: any) => listenerRef.current(message);
        const unsubscribe = addPartitionMessageListener(stableListener);
        return unsubscribe;
    }, []);
}
