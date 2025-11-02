// @ts-ignore - quantum-circuit doesn't have TypeScript definitions
import QuantumCircuit from 'quantum-circuit';
import type { Gate, GateInfo } from '@/features/gates/types';
import { GATE_DEFINITIONS } from '@/features/gates/constants';

export interface ParsedCircuit {
    numQubits: number;
    gates: Gate[];
    measurements: boolean[];
    errors: string[];
}

/**
 * Maps gate names from quantum-circuit library to our internal gate IDs
 */
const GATE_NAME_MAP: Record<string, { id: string; isControlled?: boolean }> = {
    'h': { id: 'h' },
    'x': { id: 'x' },
    'y': { id: 'y' },
    'z': { id: 'z' },
    's': { id: 's' },
    't': { id: 't' },
    'sx': { id: 'sx' },
    'cx': { id: 'cnot', isControlled: true },
    'cnot': { id: 'cnot', isControlled: true },
    'cz': { id: 'cz', isControlled: true },
    'swap': { id: 'swap' },
    'ch': { id: 'ch', isControlled: true },
    'ccx': { id: 'ccx', isControlled: true },
    'ccnot': { id: 'ccx', isControlled: true },
    'toffoli': { id: 'ccx', isControlled: true },
    'rx': { id: 'rx' },
    'ry': { id: 'ry' },
    'rz': { id: 'rz' },
    'measure': { id: 'measure' },
};

/**
 * Evaluates gate parameter expressions
 * Handles numeric values, pi constant, and arithmetic expressions
 */
function evaluateParameter(value: any): number {
    if (typeof value === 'number') {
        return value;
    }
    
    if (typeof value === 'string') {
        try {
            // Replace pi with Math.PI and evaluate
            const expr = value.replace(/pi/gi, String(Math.PI));
            return new Function(`return ${expr}`)();
        } catch {
            return parseFloat(value) || 0;
        }
    }
    
    return 0;
}

/**
 * Extracts all wires that a gate affects, sorted by connector order
 */
function getGateWires(qc: any, gateId: string, col: number): number[] {
    const affectedWires: { wire: number; connector: number }[] = [];
    
    for (let wire = 0; wire < qc.numQubits; wire++) {
        const gateAtPos = qc.gates[wire]?.[col];
        if (gateAtPos?.id === gateId) {
            affectedWires.push({ wire, connector: gateAtPos.connector });
        }
    }
    
    // Sort by connector to get correct order (0 = control, 1 = target, etc.)
    affectedWires.sort((a, b) => a.connector - b.connector);
    return affectedWires.map(w => w.wire);
}

/**
 * Determines control and target qubits based on gate type
 */
function getQubitRoles(wires: number[], gateId: string, isControlled: boolean) {
    let controlQubits: number[] = [];
    let targetQubits: number[] = [];

    if (isControlled) {
        if (gateId === 'ccx') {
            // Toffoli: 2 controls, 1 target
            controlQubits = wires.slice(0, 2);
            targetQubits = wires.slice(2);
        } else {
            // Single control gates (CNOT, CZ, CH)
            controlQubits = wires.slice(0, 1);
            targetQubits = wires.slice(1);
        }
    } else if (gateId === 'swap') {
        // SWAP acts on 2 target qubits
        targetQubits = wires;
    } else {
        // Single qubit gates
        targetQubits = wires;
    }

    return { controlQubits, targetQubits };
}

/**
 * Parses OpenQASM 2.0 code into circuit gates
 * Uses quantum-circuit library with ANTLR4 parser for robust parsing
 */
export function parseQASM(qasmCode: string): ParsedCircuit {
    const result: ParsedCircuit = {
        numQubits: 0,
        gates: [],
        measurements: [],
        errors: [],
    };

    try {
        // Parse QASM using quantum-circuit library (ANTLR4-based parser)
        const qc = new QuantumCircuit();
        qc.importQASM(qasmCode);

        result.numQubits = qc.numQubits;

        if (result.numQubits === 0) {
            result.errors.push('No qubits found in QASM file');
            return result;
        }
        
        result.measurements = new Array(result.numQubits).fill(false);

        // Track processed gates (multi-qubit gates appear multiple times)
        const processedGateIds = new Set<string>();

        // Iterate through circuit structure: gates[wire][col]
        for (let wire = 0; wire < qc.numQubits; wire++) {
            const wireGates = qc.gates[wire];
            if (!wireGates) continue;

            for (let col = 0; col < wireGates.length; col++) {
                const gateAtPos = wireGates[col];
                if (!gateAtPos) continue;

                // Skip already processed gates
                if (processedGateIds.has(gateAtPos.id)) continue;
                processedGateIds.add(gateAtPos.id);

                const gateName = gateAtPos.name?.toLowerCase();
                if (!gateName) continue;

                // Handle measurements
                if (gateName === 'measure') {
                    const wires = getGateWires(qc, gateAtPos.id, col);
                    wires.forEach(w => {
                        if (w < result.measurements.length) {
                            result.measurements[w] = true;
                        }
                    });
                    continue;
                }

                // Map to our internal gate ID
                const gateMapping = GATE_NAME_MAP[gateName];
                if (!gateMapping) {
                    result.errors.push(`Unsupported gate: '${gateName}'`);
                    continue;
                }

                // Find gate definition
                const gateInfo = GATE_DEFINITIONS.find((g: GateInfo) => g.id === gateMapping.id);
                if (!gateInfo) continue;

                // Extract parameters
                const params = gateAtPos.options?.params;
                const paramValues = params && Object.keys(params).length > 0
                    ? Object.values(params).map(evaluateParameter)
                    : undefined;

                // Get wires and determine qubit roles
                const wires = getGateWires(qc, gateAtPos.id, col);
                const { controlQubits, targetQubits } = getQubitRoles(
                    wires, 
                    gateMapping.id, 
                    gateMapping.isControlled || false
                );

                // Create gate object
                result.gates.push({
                    id: `${gateMapping.id}-${col}-${wire}-${Math.random()}`,
                    gate: gateInfo,
                    targetQubits,
                    controlQubits,
                    parameters: paramValues,
                    depth: 0,
                    parents: [],
                    children: [],
                });
            }
        }
    } catch (error) {
        const errorMsg = error instanceof Error 
            ? error.message 
            : 'Failed to parse QASM file';
        result.errors.push(errorMsg);
    }

    return result;
}
