import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CircuitInfo } from '@/features/circuit/types';

export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    circuits: CircuitInfo[];
    activeCircuitId: string;
}

interface ProjectsState {
    projects: Project[];
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
    deleteProject: (id: string) => void;
    getProject: (id: string) => Project | undefined;
    duplicateProject: (id: string) => string | null;
}

export const useProjectsStore = create<ProjectsState>()(
    persist(
        (set, get) => ({
            projects: [],
            addProject: (project) => {
                const id = `${crypto.randomUUID()}`;
                const now = Date.now();
                const newProject: Project = {
                    ...project,
                    id,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    projects: [...state.projects, newProject],
                }));
                return id;
            },
            updateProject: (id, updates) => {
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === id
                            ? { ...p, ...updates, updatedAt: Date.now() }
                            : p
                    ),
                }));
            },
            deleteProject: (id) => {
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                }));
            },
            getProject: (id) => {
                return get().projects.find((p) => p.id === id);
            },
            duplicateProject: (id) => {
                const project = get().getProject(id);
                if (!project) return null;

                const newId = get().addProject({
                    name: `${project.name} (Copy)`,
                    description: project.description,
                    circuits: JSON.parse(JSON.stringify(project.circuits)),
                    activeCircuitId: project.activeCircuitId,
                });
                return newId;
            },
        }),
        {
            name: 'projects-storage',
        }
    )
);
