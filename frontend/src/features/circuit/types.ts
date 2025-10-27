import type { Gate, DagOperation } from "@/features/gates/types";

/**
 * CircuitInfo - defines a custom circuit/partition template
 */
export interface CircuitInfo {
    id: string;
    symbol: string;
    color: string;
    gates: (Gate | Circuit)[];
}

/**
 * Circuit - a circuit instance placed in the canvas
 */
export interface Circuit extends DagOperation {
    circuit: CircuitInfo;
    startQubit: number;
}