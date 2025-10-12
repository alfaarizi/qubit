import React, { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Gate } from '@/features/gates/types';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';

interface CircuitContextValue {
    svgRef: React.RefObject<SVGSVGElement | null>;
    numQubits: number;
    setNumQubits: React.Dispatch<React.SetStateAction<number>>;
    placedGates: Gate[];
    setPlacedGates: React.Dispatch<React.SetStateAction<Gate[]>>;
    measurements: boolean[];
    setMeasurements: React.Dispatch<React.SetStateAction<boolean[]>>;
}

const CircuitContext = createContext<CircuitContextValue | null>(null);

export function CircuitProvider({ children }: { children: ReactNode }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [numQubits, setNumQubits] = useState(CIRCUIT_CONFIG.defaultNumQubits);
    const [placedGates, setPlacedGates] = useState<Gate[]>([]);
    const [measurements, setMeasurements] = useState<boolean[]>(
        Array(CIRCUIT_CONFIG.defaultNumQubits).fill(true)
    );

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