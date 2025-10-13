import type { Gate } from "@/features/gates/types";

export interface Circuit {
    id: string
    name: string
    gates: Gate[]
}