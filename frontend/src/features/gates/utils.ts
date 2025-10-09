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
 * Check if two gates overlap on any qubits
 */
export function doGatesOverlap(gate1: CircuitGate, gate2: CircuitGate): boolean {
    const qubits1 = getInvolvedQubits(gate1);
    const qubits2 = getInvolvedQubits(gate2);
    return qubits1.some(q => qubits2.includes(q));
}

/**
 * Validate that a circuit gate matches its template requirements
 */
export function isValidGate(gate: CircuitGate): boolean {
    const qubits = getInvolvedQubits(gate);
    return (
        gate.controlQubits.length === gate.gate.numControlQubits &&
        gate.targetQubits.length === gate.gate.numTargetQubits &&
        new Set(qubits).size === qubits.length  // No duplicates
    );
}

/**
 * Create a valid circuit gate instance from a gate template
 * Returns null if validation fails
 */
export function createCircuitGate(
    gate: Gate,
    depth: number,
    targetQubits: number[],
    controlQubits: number[]
): CircuitGate | null {
    // Validate target qubits
    if (targetQubits.length !== gate.numTargetQubits) {
        console.warn(`Gate ${gate.name} requires ${gate.numTargetQubits} target qubits, got ${targetQubits.length}`);
        return null;
    }

    // Validate control qubits
    if (controlQubits.length !== gate.numControlQubits) {
        console.warn(`Gate ${gate.name} requires ${gate.numControlQubits} control qubits, got ${controlQubits.length}`);
        return null;
    }

    // Check for duplicate qubits
    const allQubits = [...controlQubits, ...targetQubits];
    if (new Set(allQubits).size !== allQubits.length) {
        console.warn('Cannot place gate: duplicate qubits detected');
        return null;
    }

    return {
        id: `${gate.id}-${crypto.randomUUID()}`,
        gate,
        depth,
        targetQubits: [...targetQubits],
        controlQubits: [...controlQubits],
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