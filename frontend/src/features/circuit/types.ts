import type { Gate } from "@/features/gates/types";

export interface CircuitGate {
    id: string;
    gate: Gate;
    depth: number;
    qubit: number;
    isPreview?: boolean;
}

// export interface Circuit {
//     id: string
//     gates: DraggableGate[]
//     numQubits: number
// }