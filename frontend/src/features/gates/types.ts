import * as d3 from 'd3';

/**
 * Gate Template – defines the quantum gate type
 */
export interface Gate {
    id: string;
    name: string;
    symbol: string;
    color: string;
    description: string;
    numTargetQubits: number;
    numControlQubits: number;
}

/**
 * Circuit Gate Instance - a placed gate in the circuit
 */
export interface CircuitGate {
    id: string;
    gate: Gate;
    depth: number;
    targetQubits: number[];
    controlQubits: number[];
    parents: CircuitGate[];
    children: CircuitGate[];
    shape: d3.Selection<SVGGElement, unknown, null, undefined> | null;
}