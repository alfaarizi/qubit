import { api } from './client';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

export const circuitsApi = {
    async execute(circuitId: string, gates: (Gate | Circuit)[], signal?: AbortSignal) {
        const sortedGates = gates.sort((a, b) => a.depth - b.depth);
        const { data } = await api.post(`/circuits/${circuitId}/execute`, { gates: sortedGates }, { signal });
        return data;
    }
};
