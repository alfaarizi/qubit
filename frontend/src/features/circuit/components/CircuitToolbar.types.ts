export interface CircuitToolbarProps {
    sessionId?: string;
}

export interface SimulationOptions {
    densityMatrix: boolean;
    entropy: boolean;
}

export interface AvailableDiagram {
    id: string;
    label: string;
    plotId: string;
    group: string;
    maxPartitionSize?: number;
    strategy?: string;
}

export interface DiagramConfig {
    id: string;
    label: string;
    plotId: string;
    group: string;
    condition: boolean;
}
