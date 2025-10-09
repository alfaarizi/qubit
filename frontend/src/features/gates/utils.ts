import type { CircuitGate } from '@/features/gates/types';

export function createQubitArrays(startQubit: number, numQubits: number) {
    if (numQubits === 1) {
        return { targetQubits: [startQubit], controlQubits: [] };
    }
    const qubits = Array.from({ length: numQubits }, (_, i) => startQubit + i);
    return {
        targetQubits: [qubits[numQubits - 1]],
        controlQubits: qubits.slice(0, -1)
    };
}

export function getInvolvedQubits(gate: CircuitGate): number[] {
    return [...gate.controlQubits, ...gate.targetQubits];
}

export function getQubitSpan(gate: CircuitGate) {
    const qubits = getInvolvedQubits(gate);
    return {
        startQubit: Math.min(...qubits),
        endQubit: Math.max(...qubits)
    };
}

export function doQubitOverlaps(gate1: CircuitGate, gate2: CircuitGate): boolean {
    const qubits1 = getInvolvedQubits(gate1);
    const qubits2 = getInvolvedQubits(gate2);
    return qubits1.some(q => qubits2.includes(q));
}