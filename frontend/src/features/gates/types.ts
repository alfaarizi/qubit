export interface Gate {
    id: string;
    name: string;
    symbol: string;
    color: string;
    description: string;
    numQubits: number;
}

export interface CircuitGate {
    id: string;
    gate: Gate;
    depth: number;
    targetQubits: number[];
    controlQubits: number[];
}