export interface QuantumGate {
    id: string;
    name: string;
    symbol: string;
    color: string;
    description: string;
    qubits: number;
}

export const QUANTUM_GATES: QuantumGate[] = [
    {
        id: 'h',
        name: 'Hadamard',
        symbol: 'H',
        color: 'border-blue-500 bg-blue-50',
        description: 'Creates superposition',
        qubits: 1,
    },
    {
        id: 'x',
        name: 'Pauli-X',
        symbol: 'X',
        color: 'border-red-500 bg-red-50',
        description: 'Bit flip gate',
        qubits: 1,
    },
    {
        id: 'y',
        name: 'Pauli-Y',
        symbol: 'Y',
        color: 'border-green-500 bg-green-50',
        description: 'Y rotation gate',
        qubits: 1,
    },
    {
        id: 'z',
        name: 'Pauli-Z',
        symbol: 'Z',
        color: 'border-purple-500 bg-purple-50',
        description: 'Phase flip gate',
        qubits: 1,
    },
    {
        id: 'cnot',
        name: 'CNOT',
        symbol: 'CX',
        color: 'border-orange-500 bg-orange-50',
        description: 'Controlled NOT gate',
        qubits: 2,
    },
    {
        id: 's',
        name: 'S Gate',
        symbol: 'S',
        color: 'border-pink-500 bg-pink-50',
        description: 'Phase gate',
        qubits: 1,
    },
    {
        id: 't',
        name: 'T Gate',
        symbol: 'T',
        color: 'border-indigo-500 bg-indigo-50',
        description: 'π/8 gate',
        qubits: 1,
    },
];