import { api } from './client';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

export interface PartitionResponse {
    jobId: string;
    status: string;
    message: string;
}

function serializeGateForAPI(item: Gate | Circuit): any {
    if ('circuit' in item) {
        return {
            id: item.id,
            depth: item.depth,
            circuit: {
                id: item.circuit.id,
                symbol: item.circuit.symbol, // symbol for backend
                gates: item.circuit.gates.map(serializeGateForAPI),
            },
            start_qubit: item.startQubit,
        };
    }
    return {
        id: item.id,
        depth: item.depth,
        gate: {
            name: item.gate.symbol,  // symbol for backend
        },
        target_qubits: item.targetQubits,
        control_qubits: item.controlQubits,
        parameters: item.parameters || [],
    };
}export const circuitsApi = {
    async partition(
        circuitId: string,
        numQubits: number,
        gates: (Gate | Circuit)[],
        measurements: any[] = [],
        options: Record<string, any> = {},
        signal?: AbortSignal,
        strategy?: string
    ): Promise<PartitionResponse> {
        const serializedGates = gates
            .sort((a, b) => a.depth - b.depth)
            .map(serializeGateForAPI);

        const { data } = await api.post(
            `/circuits/${circuitId}/partition`,
            {
                numQubits,
                placedGates: serializedGates,
                measurements,
                options,
                strategy: strategy || 'kahn',
            },
            { signal }
        );
        return data;
    },
};
