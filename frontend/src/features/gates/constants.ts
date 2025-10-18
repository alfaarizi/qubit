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
        longDescription: 'The Hadamard gate creates an equal superposition of basis states. It maps the basis state |0⟩ to (|0⟩ + |1⟩)/√2 and |1⟩ to (|0⟩ - |1⟩)/√2. This gate is fundamental in quantum algorithms and is used to create quantum parallelism.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\frac{1}{\\sqrt{2}}\\begin{pmatrix}1 & 1\\\\1 & -1\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}',
            '|1\\rangle \\rightarrow \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}'
        ],
    },
    {
        id: 'x',
        name: 'Pauli-X',
        symbol: 'X',
        color: '#ef4444',
        description: 'Bit flip gate',
        longDescription: 'The Pauli-X gate is the quantum equivalent of the classical NOT gate. It flips |0⟩ to |1⟩ and vice versa. This gate performs a π rotation around the X-axis of the Bloch sphere.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}0 & 1\\\\1 & 0\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |1\\rangle',
            '|1\\rangle \\rightarrow |0\\rangle'
        ],
    },
    {
        id: 'y',
        name: 'Pauli-Y',
        symbol: 'Y',
        color: '#22c55e',
        description: 'Y rotation gate',
        longDescription: 'The Pauli-Y gate performs a π rotation around the Y-axis of the Bloch sphere. It combines both bit and phase flips, mapping |0⟩ to i|1⟩ and |1⟩ to -i|0⟩.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}0 & -i\\\\i & 0\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow i|1\\rangle',
            '|1\\rangle \\rightarrow -i|0\\rangle'
        ],
    },
    {
        id: 'z',
        name: 'Pauli-Z',
        symbol: 'Z',
        color: '#a855f7',
        description: 'Phase flip gate',
        longDescription: 'The Pauli-Z gate applies a phase flip to the |1⟩ state while leaving |0⟩ unchanged. It performs a π rotation around the Z-axis of the Bloch sphere and is crucial for phase-based quantum algorithms.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & -1\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow -|1\\rangle'
        ],
    },
    {
        id: 's',
        name: 'S Gate',
        symbol: 'S',
        color: '#ec4899',
        description: 'Phase gate',
        longDescription: 'The S gate (phase gate) applies a 90-degree phase shift to the |1⟩ state. It is equivalent to a π/2 rotation around the Z-axis and is the square root of the Pauli-Z gate.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & i\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow i|1\\rangle'
        ],
    },
    {
        id: 't',
        name: 'T Gate',
        symbol: 'T',
        color: '#6366f1',
        description: 'π/8 gate',
        longDescription: 'The T gate applies a π/4 phase shift (45 degrees) to the |1⟩ state. It is a fundamental gate in fault-tolerant quantum computing and is the fourth root of the Pauli-Z gate.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & e^{i\\pi/4}\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow e^{i\\pi/4}|1\\rangle'
        ],
    },
    // Two-Qubit Gates
    {
        id: 'cnot',
        name: 'CNOT',
        symbol: 'CX',
        color: '#f97316',
        description: 'Controlled NOT gate',
        longDescription: 'The CNOT (Controlled-X) gate performs a NOT operation on the target qubit only when the control qubit is in state |1⟩. This gate is essential for creating entanglement and is a universal two-qubit gate when combined with single-qubit gates.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & 0 & 1\\\\0 & 0 & 1 & 0\\end{pmatrix}',
        formulas: [
            '|00\\rangle \\rightarrow |00\\rangle',
            '|01\\rangle \\rightarrow |01\\rangle',
            '|10\\rangle \\rightarrow |11\\rangle',
            '|11\\rangle \\rightarrow |10\\rangle'
        ],
    },
    // Multi-Qubit Gates
    {
        id: 'ccx',
        name: 'Toffoli',
        symbol: 'CCX',
        color: '#8b5cf6',
        description: 'Controlled-Controlled-X gate',
        longDescription: 'The Toffoli gate (CCX or CCNOT) is a three-qubit gate that performs a NOT operation on the target qubit only when both control qubits are in state |1⟩. It is reversible and universal for classical computation, making it important for quantum-classical hybrid algorithms.',
        numControlQubits: 2,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.MULTI_QUBIT,
        matrix: '\\begin{pmatrix}1&0&0&0&0&0&0&0\\\\0&1&0&0&0&0&0&0\\\\0&0&1&0&0&0&0&0\\\\0&0&0&1&0&0&0&0\\\\0&0&0&0&1&0&0&0\\\\0&0&0&0&0&1&0&0\\\\0&0&0&0&0&0&0&1\\\\0&0&0&0&0&0&1&0\\end{pmatrix}',
        formulas: [
            '|110\\rangle \\rightarrow |111\\rangle',
            '|111\\rangle \\rightarrow |110\\rangle'
        ],
    }
];