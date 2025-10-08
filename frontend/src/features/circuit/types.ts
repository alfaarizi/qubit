import type { Gate } from "@/features/gates/types";

export interface DraggableGate {
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