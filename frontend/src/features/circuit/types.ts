import type { Gate, DagOperation } from "@/features/gates/types";

/**
 * CircuitTemplate - defines a custom circuit/partition template
 */
export interface CircuitTemplate {
    id: string;
    name?: string;
    symbol: string;
    color: string;
    gates: (Gate | Circuit)[];
}

/**
 * Circuit - a circuit instance placed in the canvas
 */
export interface Circuit extends DagOperation {
    circuit: CircuitTemplate;
    startQubit: number;
}