import type { GateInfo } from "@/features/gates/types";

export const GATE_CATEGORIES = {
    SINGLE_QUBIT: 'Single-Qubit Gates',
    TWO_QUBIT: 'Two-Qubit Gates',
    MULTI_QUBIT: 'Multi-Qubit Gates',
} as const;

export const GATE_CONFIG = {
    gateSize: 42,
    gateSpacing: 50,
    qubitSpacing: 50,
    backgroundOpacity: 40,
    previewOpacity: 0.5,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontFamily: 'serif',
    singleQubit: {
        borderWidth: 1,
        borderRadius: 0
    },
    multiQubit: {
        lineWidth: 1,
        targetRadius: 18,
        controlDotRadius: 4
    }
} as const;

export const GATE_DEFINITIONS: GateInfo[] = [
    // Universal Single-Qubit Gates (U Family)
    {
        id: 'u1',
        name: 'U1 Gate',
        symbol: 'U1',
        color: '#f59e0b',
        description: 'Single parameter unitary gate',
        longDescription: 'The U1 gate applies a global phase and is defined by a single parameter λ. It performs a phase rotation without affecting the quantum state probabilities.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & e^{i\\lambda}\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow e^{i\\lambda}|1\\rangle'
        ],
    },
    {
        id: 'u2',
        name: 'U2 Gate',
        symbol: 'U2',
        color: '#8b5cf6',
        description: 'Two parameter unitary gate',
        longDescription: 'The U2 gate is a special case of the U3 gate with θ = π/2. It performs a rotation in the XY plane of the Bloch sphere using two parameters φ and λ.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\frac{1}{\\sqrt{2}}\\begin{pmatrix}1 & -e^{i\\lambda}\\\\e^{i\\phi} & e^{i(\\phi+\\lambda)}\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow \\frac{1}{\\sqrt{2}}(|0\\rangle + e^{i\\phi}|1\\rangle)',
            '|1\\rangle \\rightarrow \\frac{1}{\\sqrt{2}}(-e^{i\\lambda}|0\\rangle + e^{i(\\phi+\\lambda)}|1\\rangle)'
        ],
    },
    {
        id: 'u3',
        name: 'U3 Gate',
        symbol: 'U3',
        color: '#14b8a6',
        description: 'General single-qubit rotation',
        longDescription: 'The U3 gate is a general unitary single-qubit gate that performs arbitrary rotations on the Bloch sphere using three parameters: θ (theta), φ (phi), and λ (lambda). It is the most general single-qubit gate and can represent any unitary transformation on a single qubit.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}\\cos(\\theta/2) & -e^{i\\lambda}\\sin(\\theta/2)\\\\e^{i\\phi}\\sin(\\theta/2) & e^{i(\\phi+\\lambda)}\\cos(\\theta/2)\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle + e^{i\\phi}\\sin(\\theta/2)|1\\rangle',
            '|1\\rangle \\rightarrow -e^{i\\lambda}\\sin(\\theta/2)|0\\rangle + e^{i(\\phi+\\lambda)}\\cos(\\theta/2)|1\\rangle'
        ],
    },
    // Pauli Gates
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
    // Phase Gates (S Family)
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
        id: 'sdg',
        name: 'S† Gate',
        symbol: 'Sdg',
        color: '#d1546a',
        description: 'Adjoint S gate',
        longDescription: 'The S† gate is the complex conjugate transpose (adjoint) of the S gate. It applies a -π/2 phase shift and undoes the effect of the S gate.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & -i\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow -i|1\\rangle'
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
    {
        id: 'tdg',
        name: 'T† Gate',
        symbol: 'Tdg',
        color: '#fde047',
        description: 'Adjoint T gate',
        longDescription: 'The T† gate (Tdg) is the complex conjugate transpose (adjoint) of the T gate. It applies a -π/4 phase shift and undoes the effect of the T gate.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0\\\\0 & e^{-i\\pi/4}\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle',
            '|1\\rangle \\rightarrow e^{-i\\pi/4}|1\\rangle'
        ],
    },
    // Hadamard Gate
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
    // Rotation Gates (R Family)
    {
        id: 'rx',
        name: 'RX Gate',
        symbol: 'RX',
        color: '#ef4444',
        description: 'X-axis rotation',
        longDescription: 'The RX gate performs a rotation of θ around the X-axis of the Bloch sphere.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}\\cos(\\theta/2) & -i\\sin(\\theta/2)\\\\-i\\sin(\\theta/2) & \\cos(\\theta/2)\\end{pmatrix}',
    },
    {
        id: 'ry',
        name: 'RY Gate',
        symbol: 'RY',
        color: '#22c55e',
        description: 'Y-axis rotation',
        longDescription: 'The RY gate performs a rotation of θ around the Y-axis of the Bloch sphere.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}\\cos(\\theta/2) & -\\sin(\\theta/2)\\\\\\sin(\\theta/2) & \\cos(\\theta/2)\\end{pmatrix}',
    },
    {
        id: 'rz',
        name: 'RZ Gate',
        symbol: 'RZ',
        color: '#a855f7',
        description: 'Z-axis rotation',
        longDescription: 'The RZ gate performs a rotation of θ around the Z-axis of the Bloch sphere.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\begin{pmatrix}e^{-i\\theta/2} & 0\\\\0 & e^{i\\theta/2}\\end{pmatrix}',
    },
    {
        id: 'r',
        name: 'R Gate',
        symbol: 'R',
        color: '#f59e0b',
        description: 'General rotation gate',
        longDescription: 'The R gate is a general parameterized rotation gate. It performs arbitrary rotations on the Bloch sphere using two parameters: a rotation angle and an axis of rotation.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        formulas: [
            'e^{-i\\frac{\\theta}{2}(\\cos(\\phi)X + \\sin(\\phi)Y)} (General rotation)',
            '|0\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle - i\\sin(\\theta/2)\\sin(\\phi)|1\\rangle',
            '|1\\rangle \\rightarrow -i\\sin(\\theta/2)\\cos(\\phi)|0\\rangle + \\cos(\\theta/2)|1\\rangle'
        ],
    },
    // Square Root and Special Gates
    {
        id: 'sx',
        name: 'SX Gate',
        symbol: 'SX',
        color: '#0891b2',
        description: 'Square root of X',
        longDescription: 'The SX gate is the square root of the Pauli-X gate.',
        numControlQubits: 0,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.SINGLE_QUBIT,
        matrix: '\\frac{1}{2}\\begin{pmatrix}1+i & 1-i\\\\1-i & 1+i\\end{pmatrix}',
    },
    // Two-Qubit Gates - Controlled Single Qubit Gates
    {
        id: 'ch',
        name: 'CH Gate',
        symbol: 'CH',
        color: '#3b82f6',
        description: 'Controlled-Hadamard',
        longDescription: 'The CH gate applies a Hadamard transformation to the target qubit when control is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
    },
    {
        id: 'cnot',
        name: 'CNOT',
        symbol: 'CNOT',
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
    {
        id: 'cz',
        name: 'CZ Gate',
        symbol: 'CZ',
        color: '#a855f7',
        description: 'Controlled-Z gate',
        longDescription: 'The CZ gate applies a phase flip to the target qubit when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & 1 & 0\\\\0 & 0 & 0 & -1\\end{pmatrix}',
    },
    {
        id: 'cp',
        name: 'Controlled Phase',
        symbol: 'CP',
        color: '#f59e0b',
        description: 'Controlled phase gate',
        longDescription: 'The CP gate applies a controlled phase shift. It performs a phase rotation on the target qubit when the control qubit is in state |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & 1 & 0\\\\0 & 0 & 0 & e^{i\\lambda}\\end{pmatrix}',
        formulas: [
            '|00\\rangle \\rightarrow |00\\rangle',
            '|01\\rangle \\rightarrow |01\\rangle',
            '|10\\rangle \\rightarrow |10\\rangle',
            '|11\\rangle \\rightarrow e^{i\\lambda}|11\\rangle'
        ],
    },
    {
        id: 'crx',
        name: 'Controlled RX',
        symbol: 'CRX',
        color: '#ef4444',
        description: 'Controlled X-axis rotation',
        longDescription: 'The CRX gate applies a controlled rotation around the X-axis. It rotates the target qubit by angle θ around the X-axis when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & \\cos(\\theta/2) & -i\\sin(\\theta/2)\\\\0 & 0 & -i\\sin(\\theta/2) & \\cos(\\theta/2)\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle - i\\sin(\\theta/2)|1\\rangle (X-axis rotation)'
        ],
    },
    {
        id: 'cry',
        name: 'Controlled RY',
        symbol: 'CRY',
        color: '#10b981',
        description: 'Controlled Y-axis rotation',
        longDescription: 'The CRY gate applies a controlled rotation around the Y-axis of the Bloch sphere. It rotates the target qubit by angle θ around the Y-axis when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & \\cos(\\theta/2) & -\\sin(\\theta/2)\\\\0 & 0 & \\sin(\\theta/2) & \\cos(\\theta/2)\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle + \\sin(\\theta/2)|1\\rangle (Y-axis rotation)'
        ],
    },
    {
        id: 'crz',
        name: 'Controlled RZ',
        symbol: 'CRZ',
        color: '#a855f7',
        description: 'Controlled Z-axis rotation',
        longDescription: 'The CRZ gate applies a controlled rotation around the Z-axis. It rotates the target qubit by angle θ around the Z-axis when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & e^{-i\\theta/2} & 0\\\\0 & 0 & 0 & e^{i\\theta/2}\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow e^{-i\\theta/2}|0\\rangle + ie^{i\\theta/2}|1\\rangle (Z-axis rotation)'
        ],
    },
    {
        id: 'cr',
        name: 'Controlled R',
        symbol: 'CR',
        color: '#06b6d4',
        description: 'Controlled R rotation',
        longDescription: 'The CR gate is a controlled rotation gate. When the control qubit is |1⟩, it applies a rotation parameterized by θ and φ to the target qubit.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle + e^{i\\phi}\\sin(\\theta/2)|1\\rangle (parametric rotation)'
        ],
    },
    {
        id: 'crot',
        name: 'Controlled ROT',
        symbol: 'CROT',
        color: '#ec4899',
        description: 'Controlled rotation of target qubit',
        longDescription: 'The CROT gate is a controlled three-axis rotation gate. It applies a parameterized rotation on the target qubit when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow e^{-i(\\phi+\\lambda)/2}[\\cos(\\theta/2)|0\\rangle + i\\sin(\\theta/2)|1\\rangle] (three-axis rotation)'
        ],
    },
    {
        id: 'cu',
        name: 'Controlled U3',
        symbol: 'CU',
        color: '#ea580c',
        description: 'Controlled U3 gate',
        longDescription: 'The CU gate is a controlled version of the U3 gate. It applies a general unitary rotation (parameterized by θ, φ, and λ) to the target qubit when the control qubit is |1⟩.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & \\cos(\\theta/2) & -e^{i\\lambda}\\sin(\\theta/2)\\\\0 & 0 & e^{i\\phi}\\sin(\\theta/2) & e^{i(\\phi+\\lambda)}\\cos(\\theta/2)\\end{pmatrix}',
        formulas: [
            '|0\\rangle \\rightarrow |0\\rangle (no rotation)',
            '|1\\rangle \\rightarrow \\cos(\\theta/2)|0\\rangle + e^{i\\phi}\\sin(\\theta/2)|1\\rangle (U3 rotation)'
        ],
    },
    // Two-Qubit Gates - Other
    {
        id: 'swap',
        name: 'SWAP',
        symbol: 'SWAP',
        color: '#06b6d4',
        description: 'Swap gate',
        longDescription: 'The SWAP gate exchanges the states of two qubits.',
        numControlQubits: 0,
        numTargetQubits: 2,
        category: GATE_CATEGORIES.TWO_QUBIT,
        matrix: '\\begin{pmatrix}1 & 0 & 0 & 0\\\\0 & 0 & 1 & 0\\\\0 & 1 & 0 & 0\\\\0 & 0 & 0 & 1\\end{pmatrix}',
    },
    {
        id: 'syc',
        name: 'SYC Gate',
        symbol: 'SYC',
        color: '#06d6ff',
        description: 'Sycamore gate (tunable ZZ + iXY)',
        longDescription: 'The SYC (Sycamore) gate is a controlled gate used in Google Sycamore quantum processors. It implements an interaction that is equivalent to a tunable ZZ coupling with an iXY interaction.',
        numControlQubits: 1,
        numTargetQubits: 1,
        category: GATE_CATEGORIES.TWO_QUBIT,
        formulas: [
            'e^{-i\\frac{\\pi}{12}(ZZ+iXY)} (Tunable ZZ and iXY interaction)',
            'Equivalent to: e^{-i\\frac{\\pi}{12}Z \\otimes Z} \\cdot e^{-i\\frac{\\pi}{12}X \\otimes X}'
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
    },
    {
        id: 'cswap',
        name: 'Fredkin',
        symbol: 'CSWAP',
        color: '#c026d3',
        description: 'Controlled-SWAP gate',
        longDescription: 'The Fredkin gate (CSWAP) is a three-qubit gate that performs a SWAP operation on two target qubits when the control qubit is in state |1⟩. It is a universal reversible gate and is useful for quantum error correction.',
        numControlQubits: 1,
        numTargetQubits: 2,
        category: GATE_CATEGORIES.MULTI_QUBIT,
        matrix: '\\begin{pmatrix}1&0&0&0&0&0&0&0\\\\0&1&0&0&0&0&0&0\\\\0&0&1&0&0&0&0&0\\\\0&0&0&1&0&0&0&0\\\\0&0&0&0&1&0&0&0\\\\0&0&0&0&0&0&1&0\\\\0&0&0&0&0&1&0&0\\\\0&0&0&0&0&0&0&1\\end{pmatrix}',
        formulas: [
            '|0ab\\rangle \\rightarrow |0ab\\rangle (no swap)',
            '|1ab\\rangle \\rightarrow |1ba\\rangle (swap a and b)'
        ],
    }
];