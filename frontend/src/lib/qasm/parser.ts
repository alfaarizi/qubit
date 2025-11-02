import { parseString } from 'qasm-ts';
import type { Gate, GateInfo } from '@/features/gates/types';
import { GATE_DEFINITIONS } from '@/features/gates/constants';

export interface ParsedCircuit {
    numQubits: number;
    gates: Gate[];
    measurements: boolean[];
    errors: string[];
}

export function parseQASM(qasmCode: string): ParsedCircuit {
    const result: ParsedCircuit = {
        numQubits: 0,
        gates: [],
        measurements: [],
        errors: [],
    };

    try {
        const ast = parseString(qasmCode);
        
        for (const node of ast) {
            const nodeType = (node as any).constructor?.name || '';
            
            if (nodeType === 'QuantumDeclaration') {
                const qDecl = node as any;
                const size = qDecl.size?.value;
                if (size) {
                    result.numQubits = Math.max(result.numQubits, size);
                    if (result.measurements.length < size) {
                        result.measurements = new Array(size).fill(false);
                    }
                }
            }
            else if (nodeType === 'QuantumGateCall') {
                const gateCall = node as any;
                const gate = parseGateCall(gateCall);
                if (gate) {
                    result.gates.push(gate);
                } else {
                    result.errors.push(`Failed to parse gate: ${gateCall.quantumGateName?.name}`);
                }
            }
            else if (nodeType === 'QuantumMeasurement') {
                const measurement = node as any;
                const qubitIndex = extractQubitIndex(measurement.qubit);
                if (qubitIndex !== null) {
                    result.measurements[qubitIndex] = true;
                }
            }
        }
        
        if (result.measurements.length < result.numQubits) {
            result.measurements = [
                ...result.measurements,
                ...new Array(result.numQubits - result.measurements.length).fill(false)
            ];
        }
    } catch (error) {
        result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
}

function parseGateCall(gateCall: any): Gate | null {
    const gateName = gateCall.quantumGateName?.name?.toLowerCase();
    if (!gateName) return null;
    
    const qubits = gateCall.qubits || [];
    const qubitIndices = qubits.map((q: any) => extractQubitIndex(q)).filter((i: number | null) => i !== null);
    
    const params = gateCall.parameters || [];
    const paramValues = params.map((p: any) => evaluateExpression(p));
    
    const gateMap: Record<string, { id: string; controls: number; targets: number }> = {
        'h': { id: 'H', controls: 0, targets: 1 },
        'x': { id: 'X', controls: 0, targets: 1 },
        'y': { id: 'Y', controls: 0, targets: 1 },
        'z': { id: 'Z', controls: 0, targets: 1 },
        's': { id: 'S', controls: 0, targets: 1 },
        't': { id: 'T', controls: 0, targets: 1 },
        'sx': { id: 'SX', controls: 0, targets: 1 },
        'cx': { id: 'CNOT', controls: 1, targets: 1 },
        'cz': { id: 'CZ', controls: 1, targets: 1 },
        'swap': { id: 'SWAP', controls: 0, targets: 2 },
        'ch': { id: 'CH', controls: 1, targets: 1 },
        'ccx': { id: 'CCX', controls: 2, targets: 1 },
        'rx': { id: 'RX', controls: 0, targets: 1 },
        'ry': { id: 'RY', controls: 0, targets: 1 },
        'rz': { id: 'RZ', controls: 0, targets: 1 },
    };
    
    const gateMapping = gateMap[gateName];
    if (!gateMapping) return null;
    
    const gateInfo = GATE_DEFINITIONS.find((g: GateInfo) => g.id === gateMapping.id);
    if (!gateInfo) return null;
    
    const numControls = gateMapping.controls;
    const controlQubits = qubitIndices.slice(0, numControls);
    const targetQubits = qubitIndices.slice(numControls);
    
    return {
        id: `${gateMapping.id}-${Date.now()}-${Math.random()}`,
        gate: gateInfo,
        targetQubits,
        controlQubits,
        parameters: paramValues.length > 0 ? paramValues : undefined,
        depth: 0,
        parents: [],
        children: [],
    };
}

function extractQubitIndex(node: any): number | null {
    if (!node) return null;
    
    if (node.constructor?.name === 'SubscriptedIdentifier') {
        const index = node.subscript?.[0];
        if (index?.value !== undefined) {
            return parseInt(index.value);
        }
    }
    
    if (node.constructor?.name === 'Identifier') {
        return 0;
    }
    
    return null;
}

function evaluateExpression(node: any): number {
    if (!node) return 0;
    
    const nodeType = node.constructor?.name || '';
    
    if (nodeType === 'IntegerLiteral' || nodeType === 'FloatLiteral') {
        return parseFloat(node.value);
    }
    
    if (nodeType === 'Identifier' && node.name === 'pi') {
        return Math.PI;
    }
    
    if (nodeType === 'BinaryExpression') {
        const left = evaluateExpression(node.left);
        const right = evaluateExpression(node.right);
        
        switch (node.operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '^': return Math.pow(left, right);
            default: return 0;
        }
    }
    
    if (nodeType === 'UnaryExpression') {
        const operand = evaluateExpression(node.operand);
        return node.operator === '-' ? -operand : operand;
    }
    
    return 0;
}
