import { createContext, useContext, useState, type ReactNode } from 'react';
import type { GateInfo } from '@/features/gates/types';

interface InspectorContextValue {
    hoveredGate: GateInfo | null;
    setHoveredGate: (gate: GateInfo | null) => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
    const [hoveredGate, setHoveredGate] = useState<GateInfo | null>(null);

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
