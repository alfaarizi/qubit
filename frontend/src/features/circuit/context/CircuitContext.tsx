import React, {createContext, useContext, useRef, type ReactNode, useCallback} from 'react';
import useUndo from 'use-undo';

import type { Gate } from '@/features/gates/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';

interface CircuitState {
    placedGates: Gate[];
    numQubits: number;
    measurements: boolean[];
}

interface CircuitContextValue {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    setNumQubits: (qubits: number | ((prev: number) => number)) => void;
    placedGates: Gate[];
    setPlacedGates: (gates: Gate[] | ((prev: Gate[]) => Gate[]), checkpoint?: boolean) => void;
    measurements: boolean[];
    setMeasurements: (measurements: boolean[] | ((prev: boolean[]) => boolean[])) => void;
    updateCircuit: (updater: (prev: CircuitState) => Partial<CircuitState>) => void; // ADD THIS
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (newPresent: CircuitState) => void;
}

const CircuitContext = createContext<CircuitContextValue | null>(null);

export function CircuitProvider({ children }: { children: ReactNode }) {
    const [circuitState, { set, undo, redo, canUndo, canRedo, reset }] = useUndo<CircuitState>(
        {
            placedGates: [],
            numQubits: CIRCUIT_CONFIG.defaultNumQubits,
            measurements: Array(CIRCUIT_CONFIG.defaultNumQubits).fill(true),
        },
        { useCheckpoints: true }
    );

    const svgRef = useRef<SVGSVGElement>(null);
    const circuitStateRef = useRef(circuitState.present);
    circuitStateRef.current = circuitState.present;

    const { placedGates, numQubits, measurements } = circuitState.present;

    const setPlacedGates = useCallback((
        gates: Gate[] | ((prev: Gate[]) => Gate[]),
        checkpoint: boolean = true
    ) => {
        const newGates = typeof gates === 'function' ? gates(circuitStateRef.current.placedGates) : gates;
        set({
            ...circuitStateRef.current,
            placedGates: newGates,
        }, checkpoint);
    }, [set]);

    const setNumQubits = useCallback((
        qubits: number | ((prev: number) => number)
    ) => {
        const newQubits = typeof qubits === 'function' ? qubits(circuitStateRef.current.numQubits) : qubits;
        set({
            ...circuitStateRef.current,
            numQubits: newQubits,
        }, true);
    }, [set]);

    const setMeasurements = useCallback((
        meas: boolean[] | ((prev: boolean[]) => boolean[])
    ) => {
        const newMeasurements = typeof meas === 'function' ? meas(circuitStateRef.current.measurements) : meas;
        set({
            ...circuitStateRef.current,
            measurements: newMeasurements,
        }, true);
    }, [set]);

    const updateCircuit = useCallback((
        updater: (prev: CircuitState) => Partial<CircuitState>
    ) => {
        const updates = updater(circuitStateRef.current);
        set({
            ...circuitStateRef.current,
            ...updates,
        }, true);
    }, [set]);

    return (
        <CircuitContext.Provider
            value={{
                svgRef,
                numQubits,
                setNumQubits,
                placedGates,
                setPlacedGates,
                measurements,
                setMeasurements,
                updateCircuit,
                undo,
                redo,
                canUndo,
                canRedo,
                reset,
            }}
        >
            {children}
        </CircuitContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCircuit() {
    const context = useContext(CircuitContext);
    if (!context) {
        throw new Error('useCircuit must be used within CircuitProvider');
    }
    return context;
}