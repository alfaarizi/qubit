import { create } from 'zustand';

export interface PartitionUpdate {
    type: 'phase' | 'log' | 'complete' | 'error';
    phase?: string;
    message?: string;
    progress?: number;
    result?: Record<string, unknown>;
    timestamp?: number;
}

export interface PartitionJob {
    jobId: string;
    circuitId: string;
    status: 'pending' | 'running' | 'complete' | 'error';
    updates: PartitionUpdate[];
    error: string | null;
    createdAt: number;
    toastId?: string | number;
}

interface PartitionState {
    queue: Map<string, PartitionJob>;
    version: number;
    enqueueJob: (jobId: string, circuitId: string) => void;
    setJobToastId: (jobId: string, toastId: string | number) => void;
    addUpdate: (jobId: string, update: PartitionUpdate) => void;
    setJobError: (jobId: string, error: string) => void;
    completeJob: (jobId: string) => void;
    dequeueJob: (jobId: string) => void;
    getJob: (jobId: string) => PartitionJob | undefined;
    getCircuitJobs: (circuitId: string) => PartitionJob[];
}

export const usePartitionStore = create<PartitionState>((set, get) => ({
    queue: new Map(),
    version: 0,
    
    enqueueJob: (jobId: string, circuitId: string) => {
        set((state) => {
            const newQueue = new Map(state.queue);
            newQueue.set(jobId, {
                jobId,
                circuitId,
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
    
    addUpdate: (jobId: string, update: PartitionUpdate) => {
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
