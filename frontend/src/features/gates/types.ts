export interface DagOperation {
    id: string;
    depth: number;
    parents: string[];
    children: string[];
}

/**
 * Gate Template – defines the quantum gate type
 */
export interface GateInfo {
    id: string;
    name: string;
    symbol: string;
    color: string;
    category: string;
    /** Short description shown under the gate name */
    description: string;
    /** Detailed description shown above transformations */
    longDescription?: string;
    numTargetQubits: number;
    numControlQubits: number;
    /** LaTeX representation of the gate's matrix */
    matrix?: string;
    /** LaTeX formulas describing gate transformations */
    formulas?: string[];
}

/**
 * Circuit Gate Instance - a placed gate in the circuit
 */
export interface Gate extends DagOperation {
    gate: GateInfo;
    targetQubits: number[];
    controlQubits: number[];
}