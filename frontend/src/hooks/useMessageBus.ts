import {useEffect, useRef} from 'react';
import {useJobStore} from '@/stores/jobStore';

export interface Message {
    job_id?: string;
    type: string;
    phase?: string;
    message?: string;
    progress?: number;
    result?: Record<string, unknown>;
    [key: string]: unknown;
}

type MessageListener = (message: Message) => void;
const messageListeners = new Set<MessageListener>();

export function addMessageListener(listener: MessageListener) {
    messageListeners.add(listener);
    return () => {
        messageListeners.delete(listener);
    };
}

export function broadcastMessage(message: Message) {
    const jobId = message.job_id;
    const type = message.type;

    if (!jobId || !type) return;

    const store = useJobStore.getState();

    if (type === 'error') {
        store.setJobError(jobId, message.message || 'Unknown error');
    } else if (type === 'cancelled') {
        store.dequeueJob(jobId);
    } else if (['phase', 'log', 'complete'].includes(type)) {
        const update = {
            type: type as 'phase' | 'log' | 'complete',
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

export function useMessageListener(onMessage: (message: Message) => void) {
    const listenerRef = useRef(onMessage);

    useEffect(() => {
        listenerRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        const stableListener = (message: Message) => listenerRef.current(message);
        return addMessageListener(stableListener);
    }, []);
}
