import type { Gate } from "@/features/gates/types";

export const GATE_CONFIG = {
    gateSize: 42,
    gateSpacing: 50,
    backgroundOpacity: 40,
    previewOpacity: 0.5,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontFamily: 'serif',
    singleQubit: {
        textSize: 'text-md',
        borderWidth: 1,
        borderRadius: 0
    },
    multiQubit: {
        textSize: 'text-sm',
        lineWidth: 1,
        targetRadius: 16,
        controlDotRadius: 4
    }
} as const;

export const GATES: Gate[] = [
    {
        id: 'h',
        name: 'Hadamard',
        symbol: 'H',
        color: '#3b82f6',
        description: 'Creates superposition',
        qubits: 1,
    },
    {
        id: 'x',
        name: 'Pauli-X',
        symbol: 'X',
        color: '#ef4444',
        description: 'Bit flip gate',
        qubits: 1,
    },
    {
        id: 'y',
        name: 'Pauli-Y',
        symbol: 'Y',
        color: '#22c55e',
        description: 'Y rotation gate',
        qubits: 1,
    },
    {
        id: 'z',
        name: 'Pauli-Z',
        symbol: 'Z',
        color: '#a855f7',
        description: 'Phase flip gate',
        qubits: 1,
    },
    {
        id: 'cnot',
        name: 'CNOT',
        symbol: 'CX',
        color: '#f97316',
        description: 'Controlled NOT gate',
        qubits: 2,
    },
    {
        id: 's',
        name: 'S Gate',
        symbol: 'S',
        color: '#ec4899',
        description: 'Phase gate',
        qubits: 1,
    },
    {
        id: 't',
        name: 'T Gate',
        symbol: 'T',
        color: '#6366f1',
        description: 'π/8 gate',
        qubits: 1,
    },
];