import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectsStore } from '@/stores/projectsStore';
import { useComposerStore } from '@/features/composer/ComposerStoreContext.tsx';
import ComposerPage from './ComposerPage';

export default function ProjectWorkspace() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjectsStore();
    const {
        projectName,
        circuits,
        activeCircuitId,
        setProjectName,
        setActiveCircuitId,
        reorderCircuits,
    } = useComposerStore();

    const projectIdRef = useRef<string | null>(null);

    // load composer data from projects store when component mounts or projectId changes
    useEffect(() => {
        if (!projectId) {
            // No composer ID, redirect to composer list
            navigate('/project');
            return;
        }
        const project = getProject(projectId);
        if (!project) {
            // Project not found, redirect to composer list
            navigate('/project');
            return;
        }
        // Only initialize if we're loading a new project
        if (projectIdRef.current !== projectId) {
            projectIdRef.current = projectId;
            setProjectName(project.name);
            reorderCircuits(project.circuits);
            setActiveCircuitId(project.activeCircuitId);
        }
    }, [projectId, navigate, getProject, setProjectName, reorderCircuits, setActiveCircuitId]);

    // sync changes back to the projects store whenever composer state changes
    useEffect(() => {
        if (!projectId) return;
        // Only sync if we've initialized this project
        if (projectIdRef.current !== projectId) return;

        const project = getProject(projectId);
        if (!project) return;

        // only update if there are actual changes
        const hasChanges =
            project.name !== projectName ||
            JSON.stringify(project.circuits) !== JSON.stringify(circuits) ||
            project.activeCircuitId !== activeCircuitId;
        if (hasChanges) {
            updateProject(projectId, {
                name: projectName,
                circuits,
                activeCircuitId,
            });
        }
    }, [projectName, circuits, activeCircuitId, projectId, updateProject, getProject]);
    
    // don't render if no composer
    if (!projectId || !getProject(projectId)) {
        return null;
    }

    return <ComposerPage />;
}
