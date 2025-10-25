import type { Gate, GateInfo } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

/**
 * Get all qubits involved in a gate or circuit (sorted ascending)
 */
export function getInvolvedQubits(item: Gate | Circuit): number[] {
    if ('circuit' in item) {
        const allQubits = item.circuit.gates.flatMap(g => [...g.controlQubits, ...g.targetQubits]);
        const span = Math.max(...allQubits) + 1;
        return Array.from({ length: span }, (_, i) => item.startQubit + i);
    }
    return [...item.controlQubits, ...item.targetQubits].sort((a, b) => a - b);
}

/**
 * Get the range of qubits a gate or circuit spans
 */
export function getQubitSpan(item: Gate | Circuit): {
    minQubit: number;
    maxQubit: number;
    span: number;
} {
    const involvedQubits = getInvolvedQubits(item);
    const minQubit = Math.min(...involvedQubits);
    const maxQubit = Math.max(...involvedQubits);
    return {
        minQubit,
        maxQubit,
        span: maxQubit - minQubit + 1
    };
}

/**
 * Helper for contiguous gate placement (for initial drag-and-drop)
 * Assigns control qubits first, then target qubits, starting from startQubit
 */
export function createContiguousQubitArrays(gate: GateInfo, startQubit: number) {
    const targetQubits = Array.from(
        { length: gate.numTargetQubits },
        (_, i) => startQubit + gate.numControlQubits + i
    );
    const controlQubits = Array.from(
        { length: gate.numControlQubits },
        (_, i) => startQubit + i
    );
    return { targetQubits, controlQubits };
}