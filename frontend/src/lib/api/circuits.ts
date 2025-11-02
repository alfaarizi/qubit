import { api } from './client';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

export interface PartitionResponse {
    jobId: string;
    status: string;
    message: string;
}

export const circuitsApi = {
    async partition(
        circuitId: string,
        numQubits: number,
        gates: (Gate | Circuit)[],
        measurements: any[] = [],
        options: Record<string, any> = {},
        signal?: AbortSignal,
        strategy?: string
    ): Promise<PartitionResponse> {
        const { data } = await api.post(
            `/circuits/${circuitId}/partition`,
            {
                numQubits,
                placedGates: gates.sort((a, b) => a.depth - b.depth),
                measurements,
                options,
                strategy: strategy || 'kahn',
            },
            { signal }
        );
        return data;
    },
};
