import type { GateInfo } from "@/features/gates/types";

export const GATE_CATEGORIES = {
    SINGLE_QUBIT: 'Single-Qubit Gates',
    TWO_QUBIT: 'Two-Qubit Gates',
    MULTI_QUBIT: 'Multi-Qubit Gates',
} as const;

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

export const GATES: GateInfo[] = [
    // Single-Qubit Gates
    {
        id: 'h',
        name: 'Hadamard',
        symbol: 'H',
        color: '#3b82f6',
        description: 'Creates superposition',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    {
        id: 'x',
        name: 'Pauli-X',
        symbol: 'X',
        color: '#ef4444',
        description: 'Bit flip gate',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    {
        id: 'y',
        name: 'Pauli-Y',
        symbol: 'Y',
        color: '#22c55e',
        description: 'Y rotation gate',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    {
        id: 'z',
        name: 'Pauli-Z',
        symbol: 'Z',
        color: '#a855f7',
        description: 'Phase flip gate',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    {
        id: 's',
        name: 'S Gate',
        symbol: 'S',
        color: '#ec4899',
        description: 'Phase gate',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    {
        id: 't',
        name: 'T Gate',
        symbol: 'T',
        color: '#6366f1',
        description: 'π/8 gate',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
    },
    // Two-Qubit Gates
    {
        id: 'cnot',
        name: 'CNOT',
        symbol: 'CX',
        color: '#f97316',
        description: 'Controlled NOT gate',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
    },
    // Multi-Qubit Gates
    {
        id: 'ccx',
        name: 'Toffoli',
        symbol: 'CCX',
        color: '#8b5cf6',
        description: 'Controlled-Controlled-X gate',
        numControlQubits: 2,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.MULTI_QUBIT,
    }
];