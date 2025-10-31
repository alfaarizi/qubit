import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CircuitInfo } from '@/features/circuit/types';

interface GroupCircuitState {
    circuitDefinitions: CircuitInfo[];
    defineCircuit: (circuit: CircuitInfo) => void;
    undefineCircuit: (id: string) => void;
    getCircuitDefinition: (id: string) => CircuitInfo | undefined;
}

export const useGroupCircuits = create<GroupCircuitState>()(
    persist(
        (set, get) => ({
            circuitDefinitions: [],
            defineCircuit: (circuit) =>
                set((state) => ({
                    circuitDefinitions: [...state.circuitDefinitions, circuit],
                })),
            undefineCircuit: (id) =>
                set((state) => ({
                    circuitDefinitions: state.circuitDefinitions.filter((c) => c.id !== id),
                })),
            getCircuitDefinition: (id) => get().circuitDefinitions.find((c) => c.id === id),
        }),
        {
            name: 'group-circuits-storage',
        }
    )
);
