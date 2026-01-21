import { toast } from 'sonner';

import type { Circuit } from '@/features/circuit/types';
import type { Gate } from '@/features/gates/types';
import { useJobStore } from '@/stores/jobStore';

import { UNSUPPORTED_GATES } from './CircuitToolbar.constants';

function getErrorMessage(error: unknown): string {
    const err = error as { response?: { data?: { detail?: string } }; message?: string };
    return err?.response?.data?.detail || err?.message || 'Unknown error';
}

export function findUnsupportedGates(items: (Gate | Circuit)[]): Set<string> {
    const unsupported = new Set<string>();

    function scan(item: Gate | Circuit): void {
        if (!item) return;

        if ('gate' in item && item.gate?.symbol) {
            const symbol = item.gate.symbol as typeof UNSUPPORTED_GATES[number];
            if (UNSUPPORTED_GATES.includes(symbol)) {
                unsupported.add(item.gate.symbol);
            }
        } else if ('circuit' in item) {
            item.circuit.gates.forEach(scan);
        }
    }

    items.forEach(scan);
    return unsupported;
}

export function createJob(
    circuitId: string,
    existingJobId: string | null,
    jobType: 'partition' | 'import',
    message: string
): { jobId: string; toastId: string | number } {
    if (existingJobId) {
        useJobStore.getState().dequeueJob(existingJobId);
    }

    const jobId = crypto.randomUUID();
    const toastId = toast.loading(message);
    const store = useJobStore.getState();

    store.enqueueJob(jobId, circuitId, jobType);
    store.setJobToastId(jobId, toastId);

    return { jobId, toastId };
}

export function handleJobError(
    error: unknown,
    jobId: string,
    toastId: string | number,
    title: string,
    resetExecution: () => void
): void {
    resetExecution();
    toast.dismiss(toastId);
    useJobStore.getState().dequeueJob(jobId);
    toast.error(title, { description: getErrorMessage(error), duration: 5000 });
    console.error(`${title}:`, error);
}
