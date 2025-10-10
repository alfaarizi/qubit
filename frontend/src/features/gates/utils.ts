import type { CircuitGate, Gate } from '@/features/gates/types';

/**
 * Get all qubits involved in a gate (sorted ascending)
 */
export function getInvolvedQubits(gate: CircuitGate): number[] {
    return [...gate.controlQubits, ...gate.targetQubits].sort((a, b) => a - b);
}

/**
 * Get the range of qubits a gate spans
 */
export function getQubitSpan(gate: CircuitGate): {
    startQubit: number;
    endQubit: number;
    span: number;
} {
    const qubits = getInvolvedQubits(gate);
    const startQubit = Math.min(...qubits);
    const endQubit = Math.max(...qubits);
    return {
        startQubit,
        endQubit,
        span: endQubit - startQubit + 1
    };
}

/**
 * Helper for contiguous gate placement (for initial drag-and-drop)
 * Assigns control qubits first, then target qubits, starting from startQubit
 */
export function createContiguousQubitArrays(gate: Gate, startQubit: number) {
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