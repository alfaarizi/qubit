import type { Gate } from "@/types/gates.ts";

export interface DraggableGate {
    id: string;
    gate: Gate;
    depth: number;
    qubit: number;
    isPreview?: boolean;
}