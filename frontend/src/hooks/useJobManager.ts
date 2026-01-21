import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useJobStore } from '@/stores/jobStore';

import { useMessageListener } from './useMessageBus';
import { useWebSocket } from './useWebSocket';

interface JobResult {
    totalPartitions?: number;
    totalGates?: number;
    num_qubits?: number;
    placed_gates?: unknown[];
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSuccessDescription(jobType: string, result: JobResult | undefined): string | undefined {
    if (jobType === 'partition' && result?.totalPartitions) {
        return `Created ${result.totalPartitions} partitions with ${result.totalGates} gates`;
    }
    if (jobType === 'import' && result?.num_qubits && result?.placed_gates) {
        return `Imported ${result.placed_gates.length} gates on ${result.num_qubits} qubits`;
    }
    return undefined;
}

export function useJobManager(): void {
    const processedJobs = useRef<Set<string>>(new Set());
    const { leaveRoom } = useWebSocket({ enabled: true });
    const version = useJobStore((state) => state.version);
    const queue = useJobStore((state) => state.queue);

    useMessageListener(() => {});

    useEffect(() => {
        const jobs = Array.from(queue.values());

        for (const job of jobs) {
            if (processedJobs.current.has(job.jobId)) continue;

            const isTerminal = job.status === 'complete' || job.status === 'error';
            if (!isTerminal) continue;

            processedJobs.current.add(job.jobId);

            const jobTypeDisplay = capitalize(job.jobType);
            const roomName = `${job.jobType}-${job.jobId}`;

            if (job.toastId) {
                toast.dismiss(job.toastId);
            }

            if (job.status === 'complete') {
                const completeUpdate = job.updates.find((u) => u.type === 'complete');
                const result = completeUpdate?.result as JobResult | undefined;
                toast.success(`${jobTypeDisplay} completed successfully!`, {
                    description: getSuccessDescription(job.jobType, result),
                });
            } else {
                toast.error(`${jobTypeDisplay} failed`, {
                    description: job.error || 'Unknown error occurred',
                    duration: 5000,
                });
            }

            leaveRoom(roomName, job.jobId);
            useJobStore.getState().dequeueJob(job.jobId);
        }

        const currentJobIds = new Set(jobs.map((j) => j.jobId));
        for (const jobId of processedJobs.current) {
            if (!currentJobIds.has(jobId)) {
                processedJobs.current.delete(jobId);
            }
        }
    }, [version, queue, leaveRoom]);
}
