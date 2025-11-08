import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReactNode } from 'react';
import type { CircuitInfo } from '@/types';

interface ComposerState {
    projectName: string;
    circuits: CircuitInfo[];
    activeCircuitId: string;
    setProjectName: (name: string) => void;
    setActiveCircuitId: (id: string) => void;
    addCircuit: (circuit: CircuitInfo) => void;
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
        }
    )
);

export function ComposerProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

// Re-export the hook with the same name for compatibility
export const useComposer = useComposerStore;
