import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReactNode } from 'react';
import type { CircuitInfo } from '@/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';

interface ComposerState {
    projectName: string;
    circuits: CircuitInfo[];
    activeCircuitId: string;
    setProjectName: (name: string) => void;
    setActiveCircuitId: (id: string) => void;
    addCircuit: (circuit: CircuitInfo) => void;
    addNewCircuit: () => void;
    removeCircuit: (id: string) => void;
    updateCircuit: (id: string, updates: Partial<CircuitInfo>) => void;
    reorderCircuits: (circuits: CircuitInfo[]) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useComposerStore = create<ComposerState>()(
    persist(
        (set) => ({
            projectName: 'Untitled Project',
            circuits: [],
            activeCircuitId: '',
            setProjectName: (name) => set({ projectName: name }),
            setActiveCircuitId: (id) => set({ activeCircuitId: id }),
            addCircuit: (circuit) => {
                set((state) => ({
                    circuits: [...state.circuits, circuit],
                    activeCircuitId: circuit.id,
                }));
            },
            addNewCircuit: () => {
                set((state) => {
                    const nums = state.circuits.map(c => {
                        const match = c.name.match(/Circuit\s*(\d+)/);
                        return match ? parseInt(match[1]) : NaN;
                    }).filter(n => !isNaN(n)).sort((a, b) => a - b);
                    let next = 1;
                    for (const n of nums) if (n === next) next++; else break;
                    const circuitName = state.circuits.length === 0 ? 'Circuit' : `Circuit ${next}`;
                    const circuit = {
                        id: `circuit-${crypto.randomUUID()}`,
                        name: circuitName,
                        numQubits: CIRCUIT_CONFIG.defaultNumQubits,
                        gates: [],
                    };
                    return {
                        circuits: [...state.circuits, circuit],
                        activeCircuitId: circuit.id,
                    };
                });
            },
            removeCircuit: (id) => {
                set((state) => {
                    const prev = state.circuits;
                    const filtered = prev.filter(c => c.id !== id);

                    let newActiveId = state.activeCircuitId;

                    if (filtered.length === 0) {
                        newActiveId = '';
                    } else if (state.activeCircuitId === id) {
                        const removedIndex = prev.findIndex(c => c.id === id);
                        newActiveId = removedIndex < prev.length - 1
                            ? prev[removedIndex + 1].id
                            : prev[removedIndex - 1].id;
                    }

                    return {
                        circuits: filtered,
                        activeCircuitId: newActiveId,
                    };
                });
            },
            updateCircuit: (id, updates) => {
                set((state) => ({
                    circuits: state.circuits.map(c =>
                        c.id === id ? { ...c, ...updates } : c
                    ),
                }));
            },
            reorderCircuits: (circuits) => {
                set({ circuits });
            },
        }),
        {
            name: 'project-storage',
            partialize: (state) => ({
                projectName: state.projectName,
                activeCircuitId: state.activeCircuitId,
                // only persist essential circuit info, exclude large data like results
                circuits: state.circuits.map(c => ({
                    id: c.id,
                    name: c.name,
                    numQubits: c.numQubits,
                    gates: c.gates,
                    tags: c.tags,
                    metadata: c.metadata,
                    // exclude results to save storage space
                })),
            }),
        }
    )
);

export function ComposerProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

// Re-export the hook with the same name for compatibility
// eslint-disable-next-line react-refresh/only-export-components
export const useComposer = useComposerStore;
