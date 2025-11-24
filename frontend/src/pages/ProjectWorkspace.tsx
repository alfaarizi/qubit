import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectsStore } from '@/stores/projectsStore';
import { useComposerStore } from '@/features/composer/ComposerStoreContext.tsx';
import { useResultsStore } from '@/stores/resultsStore';
import { getOrCreateCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { deserializeGateFromAPI, serializeGateForAPI } from '@/lib/api/circuits';
import type { Gate } from '@/features/gates/types';
import type { Circuit } from '@/features/circuit/types';
import type { CircuitInfo } from '@/types';
import ComposerPage from './ComposerPage';

export default function ProjectWorkspace() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { projects, loadProjects, getProject, updateProject } = useProjectsStore();
    const { getCircuitResults, setCircuitResults } = useResultsStore();
    const { projectName, circuits, activeCircuitId, setProjectName, setActiveCircuitId, reorderCircuits } = useComposerStore();

    const isInitializedRef = useRef(false);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // load projects from backend
    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    // hydrate project data when opening
    useEffect(() => {
        if (!projectId || projects.length === 0 || isInitializedRef.current) return;
        const project = getProject(projectId);
        if (!project) {
            navigate('/project');
            return;
        }
        isInitializedRef.current = true;
        // load project metadata
        setProjectName(project.name);
        reorderCircuits(project.circuits);
        setActiveCircuitId(project.activeCircuitId);
        // hydrate each circuit's gates and results
        project.circuits.forEach(circuit => {
            const store = getOrCreateCircuitStore(circuit.id);
            const state = store.getState();
            // hydrate gates if store is empty
            if (state.placedGates.length === 0 && circuit.gates?.length > 0) {
                const gates: (Gate | Circuit)[] = circuit.gates.map(deserializeGateFromAPI);
                store.getState().setPlacedGates(gates, { skipHistory: true });
                store.getState().setNumQubits(circuit.numQubits);
                store.getState().setMeasurements(Array(circuit.numQubits).fill(true));
            }
            // hydrate tags
            if (circuit.tags && circuit.tags.length > 0) {
                store.getState().setTags(circuit.tags);
            }
            // hydrate results
            if (circuit.results) {
                void setCircuitResults(circuit.id, circuit.results);
            }
        });
    }, [projectId, projects, navigate, getProject, setProjectName, reorderCircuits, setActiveCircuitId, setCircuitResults]);

    // sync to backend with debouncing
    const syncToBackend = useCallback(() => {
        if (!projectId || !isInitializedRef.current) return;
        const project = getProject(projectId);
        if (!project) return;
        // serialize current state
        const circuitsWithData: CircuitInfo[] = circuits.map(circuit => {
            const store = getOrCreateCircuitStore(circuit.id);
            const state = store.getState();
            const results = getCircuitResults(circuit.id);
            return {
                ...circuit,
                gates: state.placedGates.map(serializeGateForAPI),
                numQubits: state.numQubits,
                tags: state.tags,
                results: results || circuit.results,
            };
        });
        // only update if changed
        const hasChanges =
            project.name !== projectName ||
            JSON.stringify(project.circuits) !== JSON.stringify(circuitsWithData) ||
            project.activeCircuitId !== activeCircuitId;
        if (hasChanges) {
            void updateProject(projectId, {
                name: projectName,
                circuits: circuitsWithData,
                activeCircuitId,
            });
        }
    }, [projectId, projectName, circuits, activeCircuitId, getProject, getCircuitResults, updateProject]);

    // debounced sync on any change
    useEffect(() => {
        if (!isInitializedRef.current) return;
        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
        }
        syncTimerRef.current = setTimeout(syncToBackend, 1000);
        return () => {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
            }
        };
    }, [projectName, circuits, activeCircuitId, syncToBackend]);

    // subscribe to circuit store changes
    useEffect(() => {
        if (!projectId || !isInitializedRef.current) return;
        const unsubscribers = circuits.map(circuit => {
            const store = getOrCreateCircuitStore(circuit.id);
            return store.subscribe(() => {
                if (syncTimerRef.current) {
                    clearTimeout(syncTimerRef.current);
                }
                syncTimerRef.current = setTimeout(syncToBackend, 1000);
            });
        });
        return () => {
            unsubscribers.forEach(unsub => unsub());
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
            }
        };
    }, [projectId, circuits, syncToBackend]);

    // final sync on unmount
    useEffect(() => {
        return () => {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
            }
            if (isInitializedRef.current) {
                syncToBackend();
            }
        };
    }, [syncToBackend]);

    if (!projectId || !getProject(projectId)) {
        return null;
    }

    return <ComposerPage />;
}
