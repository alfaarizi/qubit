import type { CircuitGate } from '@/features/gates/types';
import { getInvolvedQubits } from '@/features/gates/utils';

export function getGatesToShift(
    gates: CircuitGate[],
    targetDepth: number,
    targetQubits: number[],
    excludeId?: string
): string[] {
    return gates
        .filter(g => g.id !== excludeId && g.depth >= targetDepth
            && getInvolvedQubits(g).some(q => targetQubits.includes(q))
        )
        .map(g => g.id);
}

export function shiftGates(
    gates: CircuitGate[],
    gateIds: string[],
    direction: 'left' | 'right' = 'right'
): CircuitGate[] {
    const shift = direction === 'right' ? 1 : -1;
    return gates.map(g => gateIds.includes(g.id) ? { ...g, depth: g.depth + shift } : g);
}