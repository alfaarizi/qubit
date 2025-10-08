export interface Gate {
    id: string;
    name: string;
    symbol: string;
    color: string;
    description: string;
    qubits: number;
}

export interface CircuitGate {
    id: string;
    gate: Gate;
    depth: number;
    qubit: number;
}