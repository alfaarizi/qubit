import type { Gate, GateInfo } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

/**
 * Get all qubits involved in a gate or circuit (sorted ascending)
 */
export function getInvolvedQubits(item: Gate | Circuit): number[] {
    if ('circuit' in item) {
        const allQubits = item.circuit.gates.flatMap(g => getInvolvedQubits(g));
        const span = Math.max(...allQubits) + 1;
        return Array.from({ length: span }, (_, i) => item.startQubit + i);
    }
    return [...item.controlQubits, ...item.targetQubits].sort((a, b) => a - b);
}

/**
 * Get the range of qubits a gate or circuit spans
 */
export function getSpanQubits(item: Gate | Circuit): number[]
{
    const involvedQubits = getInvolvedQubits(item);
    const minQubit = Math.min(...involvedQubits);
    const maxQubit = Math.max(...involvedQubits);
    return Array.from({ length: maxQubit - minQubit + 1 }, (_, i) => minQubit + i);
}

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
 * Get the maximum depth
 */
export function getMaxDepth(gates: (Gate | Circuit)[]): number {
    let max = 0;
    gates.forEach(g => {
        if ('circuit' in g) {
            const circuitMax = getMaxDepth(g.circuit.gates) + g.depth;
            max = Math.max(max, circuitMax);
        } else {
            max = Math.max(max, g.depth);
        }
    });
    return max;
}

/**
 * Get the bounds of a gate/circuit
 */
export function getBounds(
    gates: (Gate | Circuit)[],
    dOffset: number,
    qOffset: number
): {
    minDepth: number,
    maxDepth: number,
    minQubit: number,
    maxQubit: number
} {
    let minDepth = Infinity, maxDepth = -Infinity, minQubit = Infinity, maxQubit = -Infinity;
    gates.forEach(g => {
        const depth = g.depth + dOffset;
        if ('gate' in g) {
            const qubits = getInvolvedQubits(g).map(q => q + qOffset);
            minDepth = Math.min(minDepth, depth);
            maxDepth = Math.max(maxDepth, depth);
            minQubit = Math.min(minQubit, ...qubits);
            maxQubit = Math.max(maxQubit, ...qubits);
        } else {
            const nextBound = getBounds(g.circuit.gates, depth, g.startQubit + qOffset);
            minDepth = Math.min(minDepth, nextBound.minDepth);
            maxDepth = Math.max(maxDepth, nextBound.maxDepth);
            minQubit = Math.min(minQubit, nextBound.minQubit);
            maxQubit = Math.max(maxQubit, nextBound.maxQubit);
        }
    });
    return { minDepth, maxDepth, minQubit, maxQubit };
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