import type { Circuit } from '@/features/circuit/types';
import type { Gate } from '@/features/gates/types';
import { GATE_DEFINITIONS } from '@/features/gates/constants';
import type { SerializedGate, PartitionResponse, ImportQasmResponse } from '@/types';

import { api } from './client';

const GATE_LOOKUP = new Map(
    GATE_DEFINITIONS.map(gate => [gate.symbol.toLowerCase(), gate])
);

export function serializeGateForAPI(item: Gate | Circuit): SerializedGate {
    if ('circuit' in item) {
        return {
            id: item.id,
            depth: item.depth,
            circuit: {
                id: item.circuit.id,
                symbol: item.circuit.symbol,
                gates: item.circuit.gates.map(serializeGateForAPI),
            },
            start_qubit: item.startQubit,
        };
    }

    return {
        id: item.id,
        depth: item.depth,
        gate: { name: item.gate.symbol },
        target_qubits: item.targetQubits,
        control_qubits: item.controlQubits,
        parameters: item.parameters || [],
    };
}

export function deserializeGateFromAPI(gate: SerializedGate): Gate | Circuit {
    if (gate.circuit) {
        return {
            id: gate.id,
            depth: gate.depth,
            parents: [],
            children: [],
            circuit: {
                id: gate.circuit.id,
                symbol: gate.circuit.symbol,
                color: '#6B7280',
                gates: gate.circuit.gates.map(deserializeGateFromAPI),
            },
            startQubit: gate.start_qubit ?? 0,
        };
    }

    if (!gate.gate) {
        throw new Error('Invalid gate data: missing gate information');
    }

    const gateDefinition = GATE_LOOKUP.get(gate.gate.name.toLowerCase());

    if (!gateDefinition) {
        console.warn(`Unknown gate type: ${gate.gate.name}`);
        return {
            id: gate.id,
            depth: gate.depth,
            parents: [],
            children: [],
            gate: {
                id: gate.gate.name.toLowerCase(),
                name: gate.gate.name,
                symbol: gate.gate.name,
                color: '#9CA3AF',
                category: 'unknown',
                description: 'Unknown gate',
                numTargetQubits: gate.target_qubits?.length ?? 1,
                numControlQubits: gate.control_qubits?.length ?? 0,
            },
            targetQubits: gate.target_qubits ?? [],
            controlQubits: gate.control_qubits ?? [],
            parameters: gate.parameters,
        };
    }

    return {
        id: gate.id,
        depth: gate.depth,
        parents: [],
        children: [],
        gate: gateDefinition,
        targetQubits: gate.target_qubits ?? [],
        controlQubits: gate.control_qubits ?? [],
        parameters: gate.parameters,
    };
}

interface PartitionOptions {
    max_partition_size?: number;
    simulation_timeout?: number;
    compute_density_matrix?: boolean;
    compute_entropy?: boolean;
}

interface ImportOptions {
    simulation_timeout?: number;
}

interface JobResponse {
    job_id: string;
    status: string;
    updates?: unknown[];
    error?: string;
}

export const circuitsApi = {
    getJob: async (circuitId: string, jobId: string): Promise<JobResponse> => {
        const { data } = await api.get(`/circuits/${circuitId}/jobs/${jobId}`);
        return data;
    },

    cancelJob: async (circuitId: string, jobId: string): Promise<{ job_id: string; status: string }> => {
        const { data } = await api.post(`/circuits/${circuitId}/jobs/${jobId}/cancel`);
        return data;
    },

    partition: async (
        circuitId: string,
        circuitName: string | undefined,
        numQubits: number,
        placedGates: (Gate | Circuit)[],
        measurements: boolean[],
        options: PartitionOptions,
        strategy: string = 'kahn',
        sessionId?: string,
        jobId?: string
    ): Promise<PartitionResponse> => {
        const serializedGates = placedGates
            .slice()
            .sort((a, b) => a.depth - b.depth)
            .map(serializeGateForAPI);

        const { data } = await api.post(`/circuits/${circuitId}/partition`, {
            num_qubits: numQubits,
            placed_gates: serializedGates,
            measurements,
            options,
            strategy,
            session_id: sessionId,
            circuit_name: circuitName,
            job_id: jobId,
        });

        return data;
    },

    importQasm: async (
        circuitId: string,
        qasmCode: string,
        sessionId?: string,
        options?: ImportOptions,
        jobId?: string
    ): Promise<ImportQasmResponse> => {
        const { data } = await api.post(
            `/circuits/${circuitId}/import-qasm`,
            {
                qasm_code: qasmCode,
                session_id: sessionId,
                options,
                job_id: jobId,
            },
            { timeout: 30000 }
        );

        return data;
    },
};
