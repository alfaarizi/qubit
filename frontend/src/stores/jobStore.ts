import { create } from 'zustand';
import type { Job, JobUpdate } from '@/types';

interface JobState {
    queue: Map<string, Job>;
    version: number;
    enqueueJob: (jobId: string, circuitId: string, jobType?: 'partition' | 'import') => void;
    setJobToastId: (jobId: string, toastId: string | number) => void;
    addUpdate: (jobId: string, update: JobUpdate) => void;
    setJobError: (jobId: string, error: string) => void;
    completeJob: (jobId: string) => void;
    dequeueJob: (jobId: string) => void;
    getJob: (jobId: string) => Job | undefined;
    getCircuitJobs: (circuitId: string) => Job[];
}

export const useJobStore = create<JobState>((set, get) => ({
    queue: new Map(),
    version: 0,
    
    enqueueJob: (jobId: string, circuitId: string, jobType: 'partition' | 'import' = 'partition') => {
        set((state) => {
            const newQueue = new Map(state.queue);
            newQueue.set(jobId, {
                jobId,
                circuitId,
                jobType,
                status: 'pending',
                updates: [],
                error: null,
                createdAt: Date.now(),
            });
            return { queue: newQueue, version: state.version + 1 };
        });
    },
    
    setJobToastId: (jobId: string, toastId: string | number) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            const job = newQueue.get(jobId);
            
            if (!job) return state;
            
            newQueue.set(jobId, {
                ...job,
                toastId,
            });
            return { queue: newQueue, version: state.version + 1 };
        });
    },
    
    addUpdate: (jobId: string, update: JobUpdate) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            const job = newQueue.get(jobId);
            
            if (!job) return state;
            
            const isDuplicate = job.updates.some(u => 
                u.type === update.type &&
                u.phase === update.phase &&
                u.message === update.message &&
                (u.timestamp || 0) >= (update.timestamp || 0) - 100
            );
            
            if (!isDuplicate) {
                const status = update.type === 'complete' ? 'complete' : 
                               update.type === 'error' ? 'error' : 'running';
                
                newQueue.set(jobId, {
                    ...job,
                    status,
                    updates: [...job.updates, update],
                });
                return { queue: newQueue, version: state.version + 1 };
            }
            return state;
        });
    },
    
    setJobError: (jobId: string, error: string) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            const job = newQueue.get(jobId);
            
            if (!job) return state;
            
            newQueue.set(jobId, {
                ...job,
                status: 'error',
                error,
            });
            return { queue: newQueue, version: state.version + 1 };
        });
    },
    
    completeJob: (jobId: string) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            const job = newQueue.get(jobId);
            
            if (!job) return state;
            
            newQueue.set(jobId, {
                ...job,
                status: 'complete',
            });
            return { queue: newQueue, version: state.version + 1 };
        });
    },
    
    dequeueJob: (jobId: string) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            newQueue.delete(jobId);
            return { queue: newQueue, version: state.version + 1 };
        });
    },
    
    getJob: (jobId: string) => {
        const state = get();
        return state.queue.get(jobId);
    },
    
    getCircuitJobs: (circuitId: string) => {
        const state = get();
        return Array.from(state.queue.values()).filter(job => job.circuitId === circuitId);
    },
}));
