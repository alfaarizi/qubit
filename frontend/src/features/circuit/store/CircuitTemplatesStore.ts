import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CircuitInfo } from '@/features/circuit/types';

interface CircuitTemplatesState {
    circuits: CircuitInfo[];
    addCircuit: (circuit: CircuitInfo) => void;
    removeCircuit: (id: string) => void;
    getCircuit: (id: string) => CircuitInfo | undefined;
}

export const useCircuitTemplates = create<CircuitTemplatesState>()(
    persist(
        (set, get) => ({
            circuits: [],
            addCircuit: (circuit) =>
                set((state) => ({
                    circuits: [...state.circuits, circuit],
                })),
            removeCircuit: (id) =>
                set((state) => ({
                    circuits: state.circuits.filter((c) => c.id !== id),
                })),
            getCircuit: (id) => get().circuits.find((c) => c.id === id),
        }),
        {
            name: 'circuit-templates-storage',
        }
    )
);
