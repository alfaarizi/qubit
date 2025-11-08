import { create } from 'zustand';
import { projectsApi } from '@/lib/api/projects';
import { useProjectsStore } from './projectsStore';
import type { SimulationResults, CircuitInfo } from '@/types';

interface ResultsState {
    setCircuitResults: (circuitId: string, results: SimulationResults) => Promise<void>;
    getCircuitResults: (circuitId: string) => SimulationResults | undefined;
    clearCircuitResults: (circuitId: string) => Promise<void>;
    clearAllResults: () => Promise<void>;
}

export const useResultsStore = create<ResultsState>(() => ({
    setCircuitResults: async (circuitId: string, results: SimulationResults) => {
        const projectsStore = useProjectsStore.getState();
        const project = projectsStore.projects.find(p => p.circuits.some((c: CircuitInfo) => c.id === circuitId));
        if (!project) {
            throw new Error('project not found for circuit');
        }
        const updated = await projectsApi.updateCircuitResults(project.id, circuitId, results);
        await projectsStore.updateProject(project.id, { circuits: updated.circuits });
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
    clearCircuitResults: async (circuitId: string) => {
        const projectsStore = useProjectsStore.getState();
        for (const project of projectsStore.projects) {
            const circuitIndex = project.circuits.findIndex((c: CircuitInfo) => c.id === circuitId);
            if (circuitIndex !== -1) {
                const updatedCircuits = [...project.circuits];
                updatedCircuits[circuitIndex] = { ...updatedCircuits[circuitIndex], results: undefined };
                await projectsStore.updateProject(project.id, { circuits: updatedCircuits });
                break;
            }
        }
    },
    clearAllResults: async () => {
        const projectsStore = useProjectsStore.getState();
        await Promise.all(
            projectsStore.projects.map(async (project) => {
                const updatedCircuits = project.circuits.map((c: CircuitInfo) => ({ ...c, results: undefined }));
                await projectsStore.updateProject(project.id, { circuits: updatedCircuits });
            })
        );
    },
}));
