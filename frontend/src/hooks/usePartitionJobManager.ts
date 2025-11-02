import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { usePartitionMessageListener } from './usePartitionMessageBus';
import { usePartitionStore } from '@/stores/partitionStore';
import { toast } from 'sonner';

const ROOM_CHECK_INTERVAL = 100;

export const usePartitionJobManager = () => {
    const roomsJoinedRef = useRef<Set<string>>(new Set());
    const processedJobsRef = useRef<Set<string>>(new Set());
    
    const { isConnected, joinRoom, leaveRoom } = useWebSocket({ enabled: true });
    const version = usePartitionStore((state) => state.version);
    const queue = usePartitionStore((state) => state.queue);

    usePartitionMessageListener(() => {});

    // Manage WebSocket room subscriptions
    useEffect(() => {
        if (!isConnected) return;

        const syncRoomsWithQueue = () => {
            const queue = usePartitionStore.getState().queue;
            const jobIdsInQueue = new Set(queue.keys());
            
            jobIdsInQueue.forEach((jobId) => {
                if (!roomsJoinedRef.current.has(jobId)) {
                    roomsJoinedRef.current.add(jobId);
                    joinRoom(`partition-${jobId}`, jobId);
                }
            });

            roomsJoinedRef.current.forEach((jobId) => {
                if (!jobIdsInQueue.has(jobId)) {
                    roomsJoinedRef.current.delete(jobId);
                    leaveRoom(`partition-${jobId}`, jobId);
                }
            });
        };

        syncRoomsWithQueue();
        const interval = setInterval(syncRoomsWithQueue, ROOM_CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [isConnected, joinRoom, leaveRoom]);

    // Handle job completions and errors
    useEffect(() => {
        const jobs = Array.from(queue.values());

        jobs.forEach((job) => {
            if (processedJobsRef.current.has(job.jobId)) return;

            if (job.status === 'complete') {
                processedJobsRef.current.add(job.jobId);

                if (job.toastId) toast.dismiss(job.toastId);
                toast.success('Partition completed successfully!');
                usePartitionStore.getState().dequeueJob(job.jobId);
            }

            if (job.status === 'error') {
                processedJobsRef.current.add(job.jobId);

                if (job.toastId) toast.dismiss(job.toastId);
                toast.error('Partition failed', { description: job.error || 'Unknown error' });
                usePartitionStore.getState().dequeueJob(job.jobId);
            }
        });

        const currentJobIds = new Set(jobs.map(j => j.jobId));
        processedJobsRef.current.forEach((jobId) => {
            if (!currentJobIds.has(jobId)) {
                processedJobsRef.current.delete(jobId);
            }
        });
    }, [version, queue]);
};
