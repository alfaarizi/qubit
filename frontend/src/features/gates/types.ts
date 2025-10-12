/**
 * Gate Template – defines the quantum gate type
 */
export interface GateInfo {
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
export interface Gate {
    id: string;
    gate: GateInfo;
    depth: number;
    targetQubits: number[];
    controlQubits: number[];
    parents: string[];
    children: string[];
}