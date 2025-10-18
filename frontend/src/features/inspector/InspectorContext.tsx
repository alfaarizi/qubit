import { createContext, useContext, useState, type ReactNode } from 'react';
import type { GateInfo } from '@/features/gates/types';

interface InspectorContextValue {
    hoveredGate: GateInfo | null;
    setHoveredGate: (gate: GateInfo | null) => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);
const STORAGE_KEY = 'inspector-hovered-gate';

export function InspectorProvider({ children }: { children: ReactNode }) {
    const [hoveredGate, setHoveredGateState] = useState<GateInfo | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const setHoveredGate = (gate: GateInfo | null) => {
        setHoveredGateState(gate);
        try {
            if (gate) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(gate));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to save hovered gate to localStorage:', error);
        }
    };

    return (
        <InspectorContext.Provider value={{ hoveredGate, setHoveredGate }}>
            {children}
        </InspectorContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInspector() {
    const context = useContext(InspectorContext);
    if (!context) throw new Error('useInspector must be within InspectorProvider');
    return context;
}
