import { api } from './client';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import type { SerializedGate, PartitionResponse, ImportQasmResponse } from '@/types';
import { GATE_DEFINITIONS } from '@/features/gates/constants';

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
        gate: {
            name: item.gate.symbol,
        },
        target_qubits: item.targetQubits,
        control_qubits: item.controlQubits,
        parameters: item.parameters || [],
    };
}

export function deserializeGateFromAPI(
    gate: SerializedGate,
): Gate | Circuit {
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

export const circuitsApi = {
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
        options: {
            max_partition_size?: number;
            simulation_timeout?: number;
            compute_density_matrix?: boolean;
            compute_entropy?: boolean;
        },
        strategy?: string,
        sessionId?: string
    ): Promise<PartitionResponse> => {
        const serializedGates = placedGates
            .slice()
            .sort((a, b) => a.depth - b.depth)
            .map(serializeGateForAPI);

        const { data } = await api.post(
            `/circuits/${circuitId}/partition`,
            {
                num_qubits: numQubits,
                placed_gates: serializedGates,
                measurements,
                options,
                strategy: strategy || 'kahn',
                session_id: sessionId,
                circuit_name: circuitName,
            }
        );
        return data;
    },
    importQasm: async (
        circuitId: string,
        qasmCode: string,
        sessionId?: string,
        options?: { simulation_timeout?: number }
    ): Promise<ImportQasmResponse> => {
        const { data } = await api.post(
            `/circuits/${circuitId}/import-qasm`,
            {
                qasm_code: qasmCode,
                session_id: sessionId,
                options,
            },
            { timeout: 30000 }
        );
        return data;
    },
};
