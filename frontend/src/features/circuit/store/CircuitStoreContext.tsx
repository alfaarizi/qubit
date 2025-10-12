/* eslint-disable react-refresh/only-export-components */
import React, { type ReactNode, createContext, useContext, useRef, useState, useEffect } from 'react';
import { createStore, useStore } from 'zustand';
import { temporal } from 'zundo';

import type { Gate } from '@/features/gates/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { getInvolvedQubits } from '@/features/gates/utils';

interface CircuitState {
    placedGates: Gate[];
    numQubits: number;
    measurements: boolean[];
}

interface CircuitActions {
    setPlacedGates: (gates: Gate[] | ((prev: Gate[]) => Gate[]), options?: { skipHistory?: boolean }) => void;
    setNumQubits: (qubits: number | ((prev: number) => number)) => void;
    setMeasurements: (measurements: boolean[] | ((prev: boolean[]) => boolean[])) => void;
    updateCircuit: (updater: (prev: CircuitState) => Partial<CircuitState>) => void;
    addQubit: () => void;
    removeQubit: () => void;
    toggleMeasurement: (index: number) => void;
    reset: (newState: CircuitState) => void;
}

type CircuitStore = CircuitState & CircuitActions;

const initialState: CircuitState = {
    placedGates: [],
    numQubits: CIRCUIT_CONFIG.defaultNumQubits,
    measurements: Array(CIRCUIT_CONFIG.defaultNumQubits).fill(true),
};

// Factory to create store
const createCircuitStore = () => {
    let skipHistory = false;
    return createStore<CircuitStore>()(
        temporal(
            (set) => ({
                ...initialState,
                setPlacedGates: (placedGates, options?: { skipHistory?: boolean }) => {
                    skipHistory = options?.skipHistory === true;
                    set((state) => ({
                        placedGates: typeof placedGates === 'function' ? placedGates(state.placedGates) : placedGates,
                    }));
                    skipHistory = false;
                },
                setNumQubits: (numQubits) =>
                    set((state) => ({
                        numQubits: typeof numQubits === 'function' ? numQubits(state.numQubits) : numQubits,
                    })),
                setMeasurements: (measurements) =>
                    set((state) => ({
                        measurements: typeof measurements === 'function' ? measurements(state.measurements) : measurements,
                    })),
                updateCircuit: (updater) =>
                    set((state) => {
                        return updater({
                            placedGates: state.placedGates,
                            numQubits: state.numQubits,
                            measurements: state.measurements,
                        });
                    }),
                addQubit: () =>
                    set((state) => ({
                        numQubits: state.numQubits + 1,
                        measurements: [...state.measurements, true],
                    })),
                removeQubit: () =>
                    set((state) => {
                        if (state.numQubits <= 1) return {};
                        return {
                            numQubits: state.numQubits - 1,
                            measurements: state.measurements.slice(0, -1),
                            placedGates: state.placedGates.filter((g) => {
                                return !getInvolvedQubits(g).includes(state.numQubits - 1);
                            }),
                        };
                    }),
                toggleMeasurement: (index) =>
                    set((state) => {
                        const newMeasurements = [...state.measurements];
                        newMeasurements[index] = !newMeasurements[index];
                        return { measurements: newMeasurements };
                    }),
                reset: (newState) => set(newState),
            }),
            {
                limit: 50,
                equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
                handleSet: (handleSet) => (state) => {
                    if (skipHistory) {
                        return state;
                    }
                    return handleSet(state);
                }
            }
        )
    );
};

// Context for store + ref
type CircuitStoreApi = ReturnType<typeof createCircuitStore>;

const CircuitStoreContext = createContext<{
    store: CircuitStoreApi;
    svgRef: React.RefObject<SVGSVGElement | null>;
} | null>(null);

export function CircuitProvider({ children }: { children: ReactNode }) {
    const [store] = useState(() => createCircuitStore());
    const svgRef = useRef<SVGSVGElement>(null);

    return (
        <CircuitStoreContext.Provider value={{ store, svgRef }}>
            {children}
        </CircuitStoreContext.Provider>
    );
}

// Hooks
export function useCircuitStore<T>(selector: (state: CircuitStore) => T): T {
    const context = useContext(CircuitStoreContext);
    if (!context) throw new Error('useCircuitStore must be within CircuitProvider');
    return useStore(context.store, selector);
}

export function useCircuitSvgRef() {
    const context = useContext(CircuitStoreContext);
    if (!context) throw new Error('useCircuitSvgRef must be within CircuitProvider');
    return context.svgRef;
}

export function useCircuitHistory() {
    const context = useContext(CircuitStoreContext);
    if (!context) throw new Error('useCircuitHistory must be within CircuitProvider');

    const { undo, redo, pause, resume } = context.store.temporal.getState();
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        const unsubscribe = context.store.temporal.subscribe((state) => {
            setCanUndo(state.pastStates.length > 0);
            setCanRedo(state.futureStates.length > 0);
        });
        const initialState = context.store.temporal.getState();
        setCanUndo(initialState.pastStates.length > 0);
        setCanRedo(initialState.futureStates.length > 0);
        return unsubscribe;
    }, [context.store]);

    return { undo, redo, canUndo, canRedo, pause, resume };
}