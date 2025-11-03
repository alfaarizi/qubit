import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useMessageListener } from './useMessageBus';
import { useJobStore } from '@/stores/jobStore';
import { toast } from 'sonner';

const ROOM_CHECK_INTERVAL = 100;

export const useJobManager = () => {
    const roomsJoinedRef = useRef<Set<string>>(new Set());
    const processedJobsRef = useRef<Set<string>>(new Set());

    const { isConnected, joinRoom, leaveRoom } = useWebSocket({ enabled: true });
    const version = useJobStore((state) => state.version);
    const queue = useJobStore((state) => state.queue);

    useMessageListener(() => {});

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

                // Capitalize first letter of job type for display
                const jobTypeDisplay = job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1);

                if (job.jobType === 'partition' && result?.totalPartitions) {
                    toast.success(`${jobTypeDisplay} completed successfully!`, {
                        description: `Created ${result.totalPartitions} partitions with ${result.totalGates} gates`
                    });
                } else if (job.jobType === 'import' && result?.num_qubits && result?.placed_gates) {
                    toast.success(`${jobTypeDisplay} completed successfully!`, {
                        description: `Imported ${result.placed_gates.length} gates on ${result.num_qubits} qubits`
                    });
                } else {
                    toast.success(`${jobTypeDisplay} completed successfully!`);
                }
            }

            if (job.status === 'error') {
                processedJobsRef.current.add(job.jobId);

                if (job.toastId) toast.dismiss(job.toastId);

                const jobTypeDisplay = job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1);
                const errorMessage = job.error || 'Unknown error occurred';
                toast.error(`${jobTypeDisplay} failed`, {
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
