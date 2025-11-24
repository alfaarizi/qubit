import { create } from 'zustand';
import type { SimulationResults } from '@/types';

interface ResultsState {
    results: Record<string, SimulationResults>;
    setCircuitResults: (circuitId: string, results: SimulationResults) => void;
    getCircuitResults: (circuitId: string) => SimulationResults | undefined;
    clearCircuitResults: (circuitId: string) => void;
    clearAllResults: () => void;
}

export const useResultsStore = create<ResultsState>((set, get) => ({
    results: {},
    setCircuitResults: (circuitId: string, results: SimulationResults) => {
        set((state) => ({
            results: {
                ...state.results,
                [circuitId]: {
                    ...results,
                    timestamp: results.timestamp || Date.now(),
                },
            },
        }));
    },
    getCircuitResults: (circuitId: string) => {
        return get().results[circuitId];
    },
    clearCircuitResults: (circuitId: string) => {
        set((state) => {
            const newResults = { ...state.results };
            delete newResults[circuitId];
            return { results: newResults };
        });
    },
    clearAllResults: () => {
        set({ results: {} });
    },
}));
