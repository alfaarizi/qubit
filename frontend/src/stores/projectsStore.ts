import { create } from 'zustand';
import { projectsApi } from '@/lib/api/projects';
import type { Project, ProjectCreate, ProjectUpdate } from '@/types';

export type { Project };

interface ProjectsState {
    projects: Project[];
    isLoaded: boolean;
    isLoading: boolean;
    error: string | null;
    loadProjects: () => Promise<void>;
    addProject: (project: ProjectCreate) => Promise<string>;
    updateProject: (id: string, updates: ProjectUpdate) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    getProject: (id: string) => Project | undefined;
    duplicateProject: (id: string) => Promise<string>;
    clearError: () => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
    projects: [],
    isLoaded: false,
    isLoading: false,
    error: null,
    loadProjects: async () => {
        if (get().isLoaded || get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
            const projects = await projectsApi.list();
            set({ projects, isLoaded: true, isLoading: false });
        } catch (error: any) {
            set({ error: error.response?.data?.detail || 'failed to load projects', isLoading: false });
            throw error;
        }
    },
    addProject: async (project) => {
        set({ error: null });
        try {
            const newProject = await projectsApi.create(project);
            set((state) => ({ projects: [...state.projects, newProject] }));
            return newProject.id;
        } catch (error: any) {
            set({ error: error.response?.data?.detail || 'failed to create project' });
            throw error;
        }
    },
    updateProject: async (id, updates) => {
        set({ error: null });
        const optimisticUpdate = get().projects.find(p => p.id === id);
        if (optimisticUpdate) {
            set((state) => ({
                projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
            }));
        }
        try {
            const updated = await projectsApi.update(id, updates);
            set((state) => ({
                projects: state.projects.map((p) => (p.id === id ? updated : p)),
            }));
        } catch (error: any) {
            if (optimisticUpdate) {
                set((state) => ({
                    projects: state.projects.map((p) => (p.id === id ? optimisticUpdate : p)),
                }));
            }
            set({ error: error.response?.data?.detail || 'failed to update project' });
            throw error;
        }
    },
    deleteProject: async (id) => {
        set({ error: null });
        const backup = get().projects;
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
        try {
            await projectsApi.delete(id);
        } catch (error: any) {
            set({ projects: backup, error: error.response?.data?.detail || 'failed to delete project' });
            throw error;
        }
    },
    getProject: (id) => {
        return get().projects.find((p) => p.id === id);
    },
    duplicateProject: async (id) => {
        set({ error: null });
        try {
            const duplicated = await projectsApi.duplicate(id);
            set((state) => ({ projects: [...state.projects, duplicated] }));
            return duplicated.id;
        } catch (error: any) {
            set({ error: error.response?.data?.detail || 'failed to duplicate project' });
            throw error;
        }
    },
    clearError: () => set({ error: null }),
}));
