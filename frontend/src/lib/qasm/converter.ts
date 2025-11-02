import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';

export function circuitToQASM(
    numQubits: number,
    placedGates: (Gate | Circuit)[],
    measurements: boolean[]
): string {
    const lines: string[] = [];
    
    lines.push('OPENQASM 2.0;');
    lines.push('include "qelib1.inc";');
    lines.push('');
    lines.push(`qreg q[${numQubits}];`);
    
    const hasMeasurements = measurements.some(m => m);
    if (hasMeasurements) {
        lines.push(`creg c[${numQubits}];`);
    }
    lines.push('');
    
    const sortedGates = [...placedGates].sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        const aQubit = 'circuit' in a ? a.startQubit : Math.min(...a.targetQubits, ...a.controlQubits);
        const bQubit = 'circuit' in b ? b.startQubit : Math.min(...b.targetQubits, ...b.controlQubits);
        return aQubit - bQubit;
    });
    
    for (const item of sortedGates) {
        if ('circuit' in item) {
            lines.push(`// Nested circuit: ${item.circuit.symbol}`);
            for (const gate of item.circuit.gates) {
                const qasmLine = gateToQASM(gate, item.startQubit);
                if (qasmLine) lines.push(qasmLine);
            }
        } else {
            const qasmLine = gateToQASM(item);
            if (qasmLine) lines.push(qasmLine);
        }
    }
    
    if (hasMeasurements) {
        lines.push('');
        for (let i = 0; i < numQubits; i++) {
            if (measurements[i]) {
                lines.push(`measure q[${i}] -> c[${i}];`);
            }
        }
    }
    
    return lines.join('\n');
}

function gateToQASM(gate: Gate | Circuit, offset: number = 0): string | null {
    if ('circuit' in gate) return null;
    
    const gateId = gate.gate.id.toLowerCase();
    const targets = gate.targetQubits.map(q => q + offset);
    const controls = gate.controlQubits.map(q => q + offset);
    const params = gate.parameters || [];
    
    const gateMap: Record<string, string> = {
        'h': 'h', 'x': 'x', 'y': 'y', 'z': 'z', 's': 's', 't': 't', 'sx': 'sx',
        'cnot': 'cx', 'cx': 'cx', 'cz': 'cz', 'swap': 'swap', 'ch': 'ch', 'ccx': 'ccx',
        'rx': 'rx', 'ry': 'ry', 'rz': 'rz',
    };
    
    const qasmGate = gateMap[gateId];
    if (!qasmGate) return null;
    
    if (['rx', 'ry', 'rz'].includes(qasmGate)) {
        const angle = params[0] ?? Math.PI / 2;
        return `${qasmGate}(${angle.toFixed(6)}) q[${targets[0]}];`;
    }
    
    if (controls.length > 0 && targets.length === 1) {
        if (qasmGate === 'ccx' && controls.length === 2) {
            return `${qasmGate} q[${controls[0]}], q[${controls[1]}], q[${targets[0]}];`;
        }
        return `${qasmGate} q[${controls[0]}], q[${targets[0]}];`;
    }
    
    if (qasmGate === 'swap' && targets.length === 2) {
        return `${qasmGate} q[${targets[0]}], q[${targets[1]}];`;
    }
    
    if (targets.length === 1) {
        return `${qasmGate} q[${targets[0]}];`;
    }
    
    return null;
}

export function getQASMWithMetadata(
    numQubits: number,
    placedGates: (Gate | Circuit)[],
    measurements: boolean[]
): { code: string; lines: number; gates: number; depth: number } {
    const code = circuitToQASM(numQubits, placedGates, measurements);
    const lines = code.split('\n').length;
    const gates = placedGates.length;
    const depth = placedGates.length > 0 ? Math.max(...placedGates.map(g => g.depth)) + 1 : 0;
    
    return { code, lines, gates, depth };
}
