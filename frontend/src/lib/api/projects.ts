import { api } from './client';
import type {
  SimulationResults,
  Project,
  ProjectCreate,
  ProjectUpdate,
} from '@/types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  },
  get: async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },
  update: async (id: string, data: ProjectUpdate): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
  duplicate: async (id: string): Promise<Project> => {
    const response = await api.post<Project>(`/projects/${id}/duplicate`);
    return response.data;
  },
  updateCircuitResults: async (projectId: string, circuitId: string, results: SimulationResults): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${projectId}/circuits/${circuitId}/results`, results);
    return response.data;
  },
};
