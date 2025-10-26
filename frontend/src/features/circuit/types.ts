import type { Gate } from "@/features/gates/types";

/**
 * CircuitInfo - defines a custom circuit/partition template
 */
export interface CircuitInfo {
    id: string;
    symbol: string;
    color: string;
    gates: Gate[];
}

/**
 * Circuit - a circuit instance placed in the canvas
 */
export interface Circuit {
    id: string;
    circuit: CircuitInfo;
    depth: number;
    startQubit: number;
}