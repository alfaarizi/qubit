import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { usePartitionMessageListener } from './usePartitionMessageBus';
import { useJobStore } from '@/stores/jobStore';
import { toast } from 'sonner';

const ROOM_CHECK_INTERVAL = 100;

export const usePartitionJobManager = () => {
    const roomsJoinedRef = useRef<Set<string>>(new Set());
    const processedJobsRef = useRef<Set<string>>(new Set());
    
    const { isConnected, joinRoom, leaveRoom } = useWebSocket({ enabled: true });
    const version = useJobStore((state) => state.version);
    const queue = useJobStore((state) => state.queue);

    usePartitionMessageListener(() => {});

    // Manage WebSocket room subscriptions
    useEffect(() => {
        if (!isConnected) return;

        const syncRoomsWithQueue = () => {
            const queue = useJobStore.getState().queue;
            const jobIdsInQueue = new Set(queue.keys());

            jobIdsInQueue.forEach((jobId) => {
                if (!roomsJoinedRef.current.has(jobId)) {
                    const job = queue.get(jobId);
                    if (job) {
                        const roomName = `${job.jobType}-${jobId}`;
                        roomsJoinedRef.current.add(jobId);
                        joinRoom(roomName, jobId);
                    }
                }
            });

            roomsJoinedRef.current.forEach((jobId) => {
                if (!jobIdsInQueue.has(jobId)) {
                    const job = queue.get(jobId);
                    const roomName = job ? `${job.jobType}-${jobId}` : `partition-${jobId}`;
                    roomsJoinedRef.current.delete(jobId);
                    leaveRoom(roomName, jobId);
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
                
                const completeUpdate = job.updates.find(u => u.type === 'complete');
                const result = completeUpdate?.result as any;
                
                if (result && result.totalPartitions) {
                    toast.success('Partition completed successfully!', {
                        description: `Created ${result.totalPartitions} partitions with ${result.totalGates} gates`
                    });
                } else {
                    toast.success('Partition completed successfully!');
                }
            }

            if (job.status === 'error') {
                processedJobsRef.current.add(job.jobId);

                if (job.toastId) toast.dismiss(job.toastId);
                
                const errorMessage = job.error || 'Unknown error occurred';
                toast.error('Partition failed', { 
                    description: errorMessage,
                    duration: 5000
                });
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
