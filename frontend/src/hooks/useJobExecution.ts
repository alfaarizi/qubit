import { useEffect, useRef, useCallback } from 'react';

import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { useJobStore } from '@/stores/jobStore';
import type { Job } from '@/types';

interface UseJobExecutionResult {
    job: Job | undefined;
    jobId: string | null;
    resetExecutionRefs: () => void;
}

export function useJobExecution(circuitId: string): UseJobExecutionResult {
    const setIsExecuting = useCircuitStore((state) => state.setIsExecuting);
    const setExecutionProgress = useCircuitStore((state) => state.setExecutionProgress);
    const setExecutionStatus = useCircuitStore((state) => state.setExecutionStatus);

    const processedCount = useRef(0);
    const startTime = useRef<number | null>(null);
    const prevJobId = useRef<string | null>(null);

    const job = useJobStore((state) => {
        void state.version;
        return Array.from(state.queue.values()).find(j => j.circuitId === circuitId);
    });
    const jobId = job?.jobId || null;

    if (jobId !== prevJobId.current) {
        prevJobId.current = jobId;
        processedCount.current = 0;
        startTime.current = null;
    }

    useEffect(() => {
        if (!job) {
            setIsExecuting(false);
            return;
        }

        if (job.status === 'complete') {
            setExecutionStatus('Complete!');
            setExecutionProgress(100);
            setIsExecuting(false);
        } else if (job.status === 'error') {
            setExecutionStatus(`Error: ${job.error}`);
            setIsExecuting(false);
        } else if (job.status === 'running' || job.status === 'pending') {
            setIsExecuting(true);
            if (job.status === 'pending') {
                setExecutionStatus('Connecting to SQUANDER...');
                setExecutionProgress(0);
            }
        }
    }, [job, setExecutionStatus, setExecutionProgress, setIsExecuting]);

    const updatesLength = job?.updates.length ?? 0;

    useEffect(() => {
        if (!job || updatesLength === 0 || processedCount.current >= updatesLength) return;

        const latest = job.updates[updatesLength - 1];
        processedCount.current = updatesLength;

        if (!startTime.current && latest.type === 'phase') {
            startTime.current = latest.timestamp || Date.now();
        }

        if (latest.progress !== undefined && latest.progress !== null) {
            setExecutionProgress(latest.progress);
        }

        let statusText = latest.message || `Phase: ${latest.phase}`;
        if (latest.timestamp && startTime.current) {
            const elapsed = ((latest.timestamp - startTime.current) / 1000).toFixed(1);
            statusText += ` (${elapsed}s)`;
        }

        if (latest.type === 'phase' || latest.type === 'log') {
            setExecutionStatus(statusText);
        }
    }, [job, updatesLength, setExecutionStatus, setExecutionProgress]);

    const resetExecutionRefs = useCallback((): void => {
        processedCount.current = 0;
        startTime.current = null;
    }, []);

    return { job, jobId, resetExecutionRefs };
}
