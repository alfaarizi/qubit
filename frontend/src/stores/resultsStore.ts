import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SimulationResults {
    num_qubits?: number;
    num_shots?: number;
    errors?: Array<{ stage: string; error: string; timeout?: boolean }>;
    partition_info?: {
        strategy: string;
        max_partition_size: number;
        total_partitions: number;
        partitions: Array<{
            index: number;
            num_gates: number;
            qubits: number[];
            num_qubits: number;
            gates: Array<{
                id: string;
                name: string;
                target_qubits: number[];
                control_qubits: number[];
            }>;
        }>;
    };
    original?: {
        state_vector?: number[][];
        probabilities?: number[];
        counts?: Record<string, number>;
        density_matrix?: {
            real: number[][] | null;
            imag: number[][] | null;
        };
        entropy_scaling?: Array<{ subsystem_size: number; entropy: number }>;
        unitary?: number[][] | null;
    };
    partitioned?: {
        state_vector?: number[][];
        probabilities?: number[];
        counts?: Record<string, number>;
        density_matrix?: {
            real: number[][] | null;
            imag: number[][] | null;
        };
        entropy_scaling?: Array<{ subsystem_size: number; entropy: number }>;
        unitary?: number[][] | null;
    };
    comparison?: {
        fidelity?: number;
        probability_difference?: number[];
        max_difference?: number;
    };
    timestamp?: number;
}

interface ResultsState {
    circuitResults: Map<string, SimulationResults>;
    setCircuitResults: (circuitId: string, results: SimulationResults) => void;
    getCircuitResults: (circuitId: string) => SimulationResults | undefined;
    clearCircuitResults: (circuitId: string) => void;
    clearAllResults: () => void;
}

export const useResultsStore = create<ResultsState>()(
    persist(
        (set, get) => ({
            circuitResults: new Map(),

            setCircuitResults: (circuitId: string, results: SimulationResults) => {
                set((state) => {
                    const newResults = new Map(state.circuitResults);
                    newResults.set(circuitId, {
                        ...results,
                        timestamp: Date.now(),
                    });
                    return { circuitResults: newResults };
                });
            },

            getCircuitResults: (circuitId: string) => {
                return get().circuitResults.get(circuitId);
            },

            clearCircuitResults: (circuitId: string) => {
                set((state) => {
                    const newResults = new Map(state.circuitResults);
                    newResults.delete(circuitId);
                    return { circuitResults: newResults };
                });
            },

            clearAllResults: () => {
                set({ circuitResults: new Map() });
            },
        }),
        {
            name: 'quantum-results-storage',
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    const { state } = JSON.parse(str);
                    return {
                        state: {
                            ...state,
                            circuitResults: new Map(Object.entries(state.circuitResults || {})),
                        },
                    };
                },
                setItem: (name, value) => {
                    const circuitResults = Object.fromEntries(value.state.circuitResults);
                    localStorage.setItem(
                        name,
                        JSON.stringify({
                            state: {
                                ...value.state,
                                circuitResults,
                            },
                        })
                    );
                },
                removeItem: (name) => localStorage.removeItem(name),
            },
        }
    )
);
