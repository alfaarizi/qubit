import type { Gate } from '@/features/gates/types';
import { getInvolvedQubits } from '@/features/gates/utils';

export function getGatesToShift(
    gates: Gate[],
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
    gates: Gate[],
    gateIds: string[],
    direction: 'left' | 'right' = 'right'
): Gate[] {
    const shift = direction === 'right' ? 1 : -1;
    return gates.map(g => gateIds.includes(g.id) ? { ...g, depth: g.depth + shift } : g);
}