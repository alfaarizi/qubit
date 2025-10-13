import {createContext, useContext, useState, useCallback, type ReactNode, useEffect} from 'react';
import type { Circuit } from '@/features/circuit/types';

interface ProjectContextValue {
    circuits: Circuit[];
    activeCircuitId: string;
    setActiveCircuitId: (id: string) => void;
    addCircuit: (circuit: Circuit) => void;
    removeCircuit: (id: string) => void;
    updateCircuit: (id: string, updates: Partial<Circuit>) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [circuits, setCircuits] = useState<Circuit[]>(
        Array.from({ length: 4 }, (_, i) => ({
            id: `circuit-${i}`,
            name: `Circuit ${i + 1}`,
            gates: [],
        }))
    );
    const [activeCircuitId, setActiveCircuitId] = useState(() => {
        return localStorage.getItem('activeCircuitId') || 'circuit-0';
    });

    const addCircuit = useCallback((circuit: Circuit) => {
        setCircuits(prev => [...prev, circuit]);
        setActiveCircuitId(circuit.id);
    }, []);

    const removeCircuit = useCallback((id: string) => {
        setCircuits(prev => {
            const filtered = prev.filter(c => c.id !== id);
            if (activeCircuitId === id) {
                setActiveCircuitId(filtered[filtered.length - 1]?.id || '');
            }
            return filtered;
        });
    }, [activeCircuitId]);

    const updateCircuit = useCallback((id: string, updates: Partial<Circuit>) => {
        setCircuits(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }, []);

    useEffect(() => {
        localStorage.setItem('activeCircuitId', activeCircuitId);
    }, [activeCircuitId]);

    return (
        <ProjectContext.Provider value={{
            circuits,
            activeCircuitId,
            setActiveCircuitId,
            addCircuit,
            removeCircuit,
            updateCircuit
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be within ProjectProvider');
    return context;
}