import type { Gate, GateInfo } from '@/features/gates/types';

/**
 * Get all qubits involved in a gate (sorted ascending)
 */
export function getInvolvedQubits(gate: Gate): number[] {
    return [...gate.controlQubits, ...gate.targetQubits].sort((a, b) => a - b);
}

/**
 * Get the range of qubits a gate spans
 */
export function getQubitSpan(gate: Gate): {
    minQubit: number;
    maxQubit: number;
    span: number;
} {
    const involvedQubits = getInvolvedQubits(gate);
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