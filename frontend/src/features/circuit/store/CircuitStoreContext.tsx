/* eslint-disable react-refresh/only-export-components */
import React, { type ReactNode, createContext, useContext, useRef, useState, useEffect } from 'react';
import { createStore, useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import { getInvolvedQubits } from '@/features/gates/utils';

interface CircuitState {
    placedGates: (Gate | Circuit)[];
    numQubits: number;
    measurements: boolean[];
    showNestedCircuit: boolean;
}

interface CircuitActions {
    setPlacedGates: (gates: (Gate | Circuit)[] | ((prev: (Gate | Circuit)[]) => (Gate | Circuit)[]), options?: { skipHistory?: boolean }) => void;
    setNumQubits: (qubits: number | ((prev: number) => number)) => void;
    setMeasurements: (measurements: boolean[] | ((prev: boolean[]) => boolean[])) => void;
    setShowNestedCircuit: (show: boolean | ((prev: boolean) => boolean)) => void;
    updateCircuit: (updater: (prev: CircuitState) => Partial<CircuitState>) => void;
    addQubit: () => void;
    removeQubit: () => void;
    toggleMeasurement: (index: number) => void;
    group: (items: (Gate | Circuit)[], symbol?: string, color?: string) => Circuit;
    ungroup: (circuit: Circuit) => (Gate | Circuit)[];
    reset: (newState: CircuitState) => void;
}

type CircuitStore = CircuitState & CircuitActions;
type CircuitStoreApi = ReturnType<typeof createCircuitStore>;

const initialState: CircuitState = {
    placedGates: [],
    numQubits: CIRCUIT_CONFIG.defaultNumQubits,
    measurements: Array(CIRCUIT_CONFIG.defaultNumQubits).fill(true),
    showNestedCircuit: false,
};

const circuitStores = new Map<string, CircuitStoreApi>();

// Factory to create store
const createCircuitStore = (circuitId: string) => {
    let skipHistory = false;
    return createStore<CircuitStore>()(
        persist(
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
                    setShowNestedCircuit: (show) =>
                        set((state) => ({
                            showNestedCircuit: typeof show === 'function' ? show(state.showNestedCircuit) : show,
                        })),
                    updateCircuit: (updater) =>
                        set((state) => {
                            return updater({
                                placedGates: state.placedGates,
                                numQubits: state.numQubits,
                                measurements: state.measurements,
                                showNestedCircuit: state.showNestedCircuit,
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
                    group: (items, symbol = 'GRP', color = '#6366f1') => {
                        const minDepth = Math.min(...items.map(item => item.depth));
                        const minQubit = Math.min(...items.flatMap(item => getInvolvedQubits(item)));
                        return {
                            id: `${symbol}-${crypto.randomUUID()}`,
                            depth: minDepth,
                            startQubit: minQubit,
                            parents: [],
                            children: [],
                            circuit: {
                                id: `${symbol}-${crypto.randomUUID()}`,
                                symbol,
                                color,
                                gates: items.map(item => ({
                                    ...item,
                                    depth: item.depth - minDepth,
                                    parents: [],
                                    children: [],
                                    ...('circuit' in item
                                        ? { startQubit: item.startQubit - minQubit }
                                        : {
                                            targetQubits: item.targetQubits.map(q => q - minQubit),
                                            controlQubits: item.controlQubits.map(q => q - minQubit),
                                        }
                                    ),
                                })),
                            },
                        } as Circuit;
                    },
                    ungroup: (circuit) => {
                        return circuit.circuit.gates.map(item => ({
                            ...item,
                            id: `${item.id.split('-')[0]}-${crypto.randomUUID()}`,
                            depth: item.depth + circuit.depth,
                            parents: [],
                            children: [],
                            ...('circuit' in item
                                ? { startQubit: item.startQubit + circuit.startQubit }
                                : {
                                    targetQubits: item.targetQubits.map(q => q + circuit.startQubit),
                                    controlQubits: item.controlQubits.map(q => q + circuit.startQubit),
                                }
                            ),
                        })) as (Gate | Circuit)[];
                    },
                    reset: (newState) => set(newState),
                }),
                {
                    limit: 50,
                    partialize: (state) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { showNestedCircuit, ...rest } = state;
                        return rest;
                    },
                    equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
                    handleSet: (handleSet) => (state) => {
                        if (skipHistory) {
                            return state;
                        }
                        return handleSet(state);
                    },
                }
            ),
            {
                name: `circuit-${circuitId}-storage`
            }
        )
    );
};

export function getOrCreateCircuitStore(circuitId: string): CircuitStoreApi {
    if (!circuitStores.has(circuitId)) {
        circuitStores.set(circuitId, createCircuitStore(circuitId));
    }
    return circuitStores.get(circuitId)!;
}



// Context for store + ref
interface CircuitContextValue {
    store: CircuitStoreApi;
    svgRef: React.RefObject<SVGSVGElement | null>;
    circuitId: string;
}

const CircuitContext = createContext<CircuitContextValue | null>(null);

export function CircuitProvider({ children, circuitId }: { children: ReactNode; circuitId: string }) {
    const store = React.useMemo(() => getOrCreateCircuitStore(circuitId), [circuitId]);
    const svgRef = useRef<SVGSVGElement>(null);

    return (
        <CircuitContext.Provider value={{ store, svgRef, circuitId }}>
            {children}
        </CircuitContext.Provider>
    );
}



// Hooks
export function useCircuitStore<T>(selector: (state: CircuitStore) => T): T {
    const context = useContext(CircuitContext);
    if (!context) throw new Error('useCircuitStore must be within CircuitProvider');
    return useStore(context.store, selector);
}

export function useCircuitStateById(circuitId: string) {
    const store = React.useMemo(() => getOrCreateCircuitStore(circuitId), [circuitId]);
    const placedGates = useStore(store, s => s.placedGates);
    const numQubits = useStore(store, s => s.numQubits);
    const measurements = useStore(store, s => s.measurements);
    return { placedGates, numQubits, measurements };
}

export function useCircuitSvgRef() {
    const context = useContext(CircuitContext);
    if (!context) throw new Error('useCircuitSvgRef must be within CircuitProvider');
    return context.svgRef;
}

export function useCircuitHistory() {
    const context = useContext(CircuitContext);
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