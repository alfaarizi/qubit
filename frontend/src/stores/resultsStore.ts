import { create } from 'zustand';
import { projectsApi } from '@/lib/api/projects';
import { useProjectsStore } from './projectsStore';
import type { SimulationResults, CircuitInfo } from '@/types';

interface ResultsState {
    setCircuitResults: (circuitId: string, results: SimulationResults) => Promise<void>;
    getCircuitResults: (circuitId: string) => SimulationResults | undefined;
    clearCircuitResults: (circuitId: string) => void;
    clearAllResults: () => void;
}

export const useResultsStore = create<ResultsState>(() => ({
    setCircuitResults: async (circuitId: string, results: SimulationResults) => {
        try {
            const projectsStore = useProjectsStore.getState();
            const project = projectsStore.projects.find(p => p.circuits.some((c: CircuitInfo) => c.id === circuitId));
            if (!project) {
                throw new Error('project not found for circuit');
            }
            const updated = await projectsApi.updateCircuitResults(project.id, circuitId, results);
            projectsStore.updateProject(project.id, { circuits: updated.circuits });
        } catch (error) {
            console.error('failed to save results:', error);
            throw error;
        }
    },
    getCircuitResults: (circuitId: string) => {
        const projectsStore = useProjectsStore.getState();
        for (const project of projectsStore.projects) {
            const circuit = project.circuits.find((c: CircuitInfo) => c.id === circuitId);
            if (circuit?.results) {
                return circuit.results as SimulationResults;
            }
        }
        return undefined;
    },
    clearCircuitResults: (circuitId: string) => {
        const projectsStore = useProjectsStore.getState();
        for (const project of projectsStore.projects) {
            const circuitIndex = project.circuits.findIndex((c: CircuitInfo) => c.id === circuitId);
            if (circuitIndex !== -1) {
                const updatedCircuits = [...project.circuits];
                updatedCircuits[circuitIndex] = { ...updatedCircuits[circuitIndex], results: undefined };
                projectsStore.updateProject(project.id, { circuits: updatedCircuits });
                break;
            }
        }
    },
    clearAllResults: () => {
        const projectsStore = useProjectsStore.getState();
        projectsStore.projects.forEach(project => {
            const updatedCircuits = project.circuits.map((c: CircuitInfo) => ({ ...c, results: undefined }));
            projectsStore.updateProject(project.id, { circuits: updatedCircuits });
        });
    },
}));
