import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CircuitInfo } from '@/features/circuit/types';
import { projectsApi } from '@/lib/api/projects';
import { toast } from 'sonner';

export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    circuits: CircuitInfo[];
    activeCircuitId: string;
    isArchived?: boolean;
    isShared?: boolean;
    owner?: string;
}

interface ProjectsState {
    projects: Project[];
    isLoading: boolean;
    isSynced: boolean;
    loadProjects: () => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    deleteAllProjects: () => Promise<void>;
    getProject: (id: string) => Project | undefined;
    duplicateProject: (id: string) => Promise<string | null>;
    archiveProject: (id: string) => Promise<void>;
    unarchiveProject: (id: string) => Promise<void>;
}

const isAuthenticated = () => !!localStorage.getItem('auth_token');

export const useProjectsStore = create<ProjectsState>()(
    persist(
        (set, get) => ({
            projects: [],
            isLoading: false,
            isSynced: false,
            loadProjects: async () => {
                if (!isAuthenticated()) {
                    set({ isLoading: false, isSynced: false });
                    return;
                }
                try {
                    set({ isLoading: true });
                    const storedProjects = get().projects;
                    console.log(`[Load] Loading projects... (${storedProjects.length} in localStorage)`);

                    const response = await projectsApi.list({ includeArchived: true });
                    const dbProjects = response.projects;
                    console.log(`[Load] Fetched ${dbProjects.length} projects from database`);

                    // identify projects that need to be synced
                    // these are projects that exist locally but not in database
                    const localOnlyProjects = storedProjects.filter(
                        local => !dbProjects.some(db => db.id === local.id)
                    );

                    if (localOnlyProjects.length > 0) {
                        console.log(`[Sync] Found ${localOnlyProjects.length} local projects to sync:`,
                            localOnlyProjects.map(p => ({ id: p.id, name: p.name })));

                        const syncPromises = localOnlyProjects.map(async (project) => {
                            try {
                                const { id, createdAt, updatedAt, owner, isShared, ...projectData } = project;
                                const synced = await projectsApi.create(projectData);
                                console.log(`[Sync] Successfully synced "${project.name}"`);
                                return synced;
                            } catch (error) {
                                console.error(`[Sync] Failed to sync "${project.name}":`, error);
                                // keep local version if sync fails
                                return project;
                            }
                        });
                        const syncedProjects = await Promise.all(syncPromises);

                        // use only database projects (both original and newly synced)
                        const allProjects = [...dbProjects, ...syncedProjects.filter(p =>
                            !dbProjects.some(db => db.id === p.id)
                        )];

                        console.log(`[Load] Final project count: ${allProjects.length}`);
                        set({ projects: allProjects, isSynced: true, isLoading: false });

                        const successCount = syncedProjects.filter(p =>
                            !localOnlyProjects.find(local => local.id === p.id)
                        ).length;
                        if (successCount > 0) {
                            toast.success(`Synced ${successCount} project${successCount > 1 ? 's' : ''} to your account`);
                        }
                    } else {
                        // no local projects to sync, just use database projects
                        console.log(`[Load] No local projects to sync, using ${dbProjects.length} database projects`);
                        set({ projects: dbProjects, isSynced: true, isLoading: false });
                    }
                } catch (error) {
                    console.error('[Sync] Failed to load projects from database:', error);
                    toast.error('Failed to sync projects');
                    set({ isLoading: false, isSynced: false });
                }
            },
            addProject: async (project) => {
                const id = `${crypto.randomUUID()}`;
                const now = Date.now();
                const localProject: Project = {
                    ...project,
                    id,
                    createdAt: now,
                    updatedAt: now,
                };

                if (isAuthenticated()) {
                    try {
                        const newProject = await projectsApi.create(project);
                        set((state) => ({
                            projects: [...state.projects, newProject],
                        }));
                        toast.success('Project saved to your account');
                        return newProject.id;
                    } catch (error) {
                        console.error('Failed to create project:', error);
                        toast.error('Failed to save project to database');
                        set((state) => ({
                            projects: [...state.projects, localProject],
                        }));
                        return id;
                    }
                } else {
                    set((state) => ({
                        projects: [...state.projects, localProject],
                    }));
                    toast.warning('Project saved locally (sign in to sync)');
                    return id;
                }
            },
            updateProject: async (id, updates) => {
                const localUpdate = {
                    ...updates,
                    updatedAt: Date.now()
                };

                // always update locally first for immediate feedback
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id ? { ...p, ...localUpdate } : p
                    ),
                }));

                if (isAuthenticated()) {
                    try {
                        const updatedProject = await projectsApi.update(id, updates);
                        // sync with database response
                        set((state) => ({
                            projects: state.projects.map((p) =>
                                p.id === id ? updatedProject : p
                            ),
                        }));
                    } catch (error: any) {
                        if (error.response?.status === 404) {
                            // project not yet indexed in database (newly created), will retry on next update
                            console.log('[Update] Project not yet indexed, saved locally (will sync on next update)');
                        } else {
                            console.error('Failed to update project:', error);
                            // don't show error toast for every auto-save failure
                        }
                    }
                }
            },
            deleteProject: async (id) => {
                const project = get().getProject(id);
                if (!project) {
                    console.error('[Delete] Project not found in local store:', id);
                    return;
                }

                if (isAuthenticated()) {
                    try {
                        await projectsApi.delete(id);
                        console.log('[Delete] Successfully deleted project from database:', id);
                    } catch (error: any) {
                        if (error.response?.status === 404) {
                            // Project ID mismatch between localStorage and database
                            // This happens when projects were duplicated during auto-sync
                            console.warn('[Delete] Project ID not found in database:', id);
                            console.warn('[Delete] Project details:', { name: project.name, id: project.id });

                            // Reload projects from database to get correct IDs
                            console.log('[Delete] Reloading projects from database...');
                            await get().loadProjects();

                            const allProjects = get().projects;
                            console.log('[Delete] Projects after reload:', allProjects.map(p => ({ name: p.name, id: p.id })));

                            // Find the project by name in the refreshed list
                            const refreshedProject = allProjects.find(p => p.name === project.name);
                            if (refreshedProject) {
                                console.log('[Delete] Found project with correct ID:', refreshedProject.id);

                                // Check if this is a different ID
                                if (refreshedProject.id === id) {
                                    console.error('[Delete] Same ID after refresh - project truly does not exist in database');
                                    // Just delete locally
                                    set((state) => ({
                                        projects: state.projects.filter((p) => p.id !== id),
                                    }));
                                    toast.success('Project deleted locally');
                                    return;
                                }

                                try {
                                    await projectsApi.delete(refreshedProject.id);
                                    console.log('[Delete] Successfully deleted from database with correct ID');
                                    // Remove from local store
                                    set((state) => ({
                                        projects: state.projects.filter((p) => p.id !== refreshedProject.id),
                                    }));
                                    toast.success('Project deleted');
                                    return;
                                } catch (retryError: any) {
                                    console.error('[Delete] Failed to delete after refresh:', retryError);
                                    // Delete locally anyway since it's causing issues
                                    set((state) => ({
                                        projects: state.projects.filter((p) => p.id !== id),
                                    }));
                                    toast.warning('Project deleted locally only');
                                    return;
                                }
                            } else {
                                console.warn('[Delete] Project not found in database after refresh - deleting locally only');
                                set((state) => ({
                                    projects: state.projects.filter((p) => p.id !== id),
                                }));
                                toast.success('Project deleted locally');
                                return;
                            }
                        } else {
                            console.error('Failed to delete project from database:', error);
                            toast.error('Failed to delete project from database');
                            return; // don't delete locally if database delete failed
                        }
                    }
                }

                // delete from local store
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                }));
                console.log('[Delete] Removed project from local store:', id);
                toast.success('Project deleted');
            },
            deleteAllProjects: async () => {
                console.log('[DeleteAll] Starting to delete all projects...');
                const localProjects = get().projects;
                console.log(`[DeleteAll] Found ${localProjects.length} projects in localStorage`);

                if (isAuthenticated()) {
                    try {
                        // Use backend endpoint to delete all projects from database
                        const result = await projectsApi.deleteAll();
                        console.log(`[DeleteAll] Deleted ${result.deleted_count} projects from database`);
                        toast.success(`Deleted ${result.deleted_count} project${result.deleted_count !== 1 ? 's' : ''} from database`);
                    } catch (error) {
                        console.error('[DeleteAll] Failed to delete projects from database:', error);
                        toast.error('Failed to delete projects from database');
                        return; // Don't clear localStorage if database delete failed
                    }
                }

                // Clear localStorage
                set({ projects: [], isSynced: false });
                console.log('[DeleteAll] Cleared localStorage');
                toast.success('All projects deleted');
            },
            getProject: (id) => {
                return get().projects.find((p) => p.id === id);
            },
            duplicateProject: async (id) => {
                const project = get().getProject(id);
                if (!project) return null;

                const newId = await get().addProject({
                    name: `${project.name} (Copy)`,
                    description: project.description,
                    circuits: JSON.parse(JSON.stringify(project.circuits)),
                    activeCircuitId: project.activeCircuitId,
                });
                return newId;
            },
            archiveProject: async (id) => {
                await get().updateProject(id, { isArchived: true });
            },
            unarchiveProject: async (id) => {
                await get().updateProject(id, { isArchived: false });
            },
        }),
        {
            name: 'projects-storage',
        }
    )
);

// Expose store to window for debugging (development only)
if (import.meta.env.DEV) {
    (window as any).projectsStore = useProjectsStore;
}