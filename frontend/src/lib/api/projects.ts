import { api } from './client';
import type { Project } from '@/stores/projectsStore';

interface ProjectListResponse {
    projects: Project[];
    total: number;
    page: number;
    page_size: number;
}

interface ShareLinkResponse {
    project_id: string;
    link_access: 'none' | 'view' | 'edit';
    share_token: string | null;
    share_url: string | null;
    created_at: number;
    updated_at: number;
}

interface CollaboratorResponse {
    id: string;
    project_id: string;
    user_email: string;
    role: 'owner' | 'editor' | 'viewer';
    granted_at: number;
    granted_by: string;
}

export const projectsApi = {
    list: async (params?: {
        page?: number;
        pageSize?: number;
        includeArchived?: boolean;
        includeShared?: boolean;
    }): Promise<ProjectListResponse> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.pageSize) queryParams.set('page_size', params.pageSize.toString());
        if (params?.includeArchived !== undefined)
            queryParams.set('include_archived', params.includeArchived.toString());
        if (params?.includeShared !== undefined)
            queryParams.set('include_shared', params.includeShared.toString());

        const query = queryParams.toString();
        const { data } = await api.get(`/projects${query ? `?${query}` : ''}`);
        return data;
    },

    get: async (projectId: string): Promise<Project> => {
        const { data } = await api.get(`/projects/${projectId}`);
        return data;
    },

    create: async (
        project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'owner' | 'isShared'>
    ): Promise<Project> => {
        const { data } = await api.post('/projects', project);
        return data;
    },

    update: async (
        projectId: string,
        updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'owner'>>
    ): Promise<Project> => {
        const { data} = await api.put(`/projects/${projectId}`, updates);
        return data;
    },

    delete: async (projectId: string): Promise<void> => {
        await api.delete(`/projects/${projectId}`);
    },

    deleteAll: async (): Promise<{ deleted_count: number }> => {
        const { data } = await api.delete('/projects');
        return data;
    },

    addCollaborator: async (
        projectId: string,
        email: string,
        role: 'editor' | 'viewer'
    ): Promise<CollaboratorResponse> => {
        const { data } = await api.post(`/projects/${projectId}/collaborators`, {
            user_email: email,
            role,
        });
        return data;
    },

    listCollaborators: async (projectId: string): Promise<CollaboratorResponse[]> => {
        const { data } = await api.get(`/projects/${projectId}/collaborators`);
        return data;
    },

    removeCollaborator: async (projectId: string, collaboratorId: string): Promise<void> => {
        await api.delete(`/projects/${projectId}/collaborators/${collaboratorId}`);
    },

    updateShareLink: async (
        projectId: string,
        linkAccess: 'none' | 'view' | 'edit'
    ): Promise<ShareLinkResponse> => {
        const { data } = await api.put(`/projects/${projectId}/share-link`, {
            link_access: linkAccess,
        });
        return data;
    },

    getShareLink: async (projectId: string): Promise<ShareLinkResponse> => {
        const { data } = await api.get(`/projects/${projectId}/share-link`);
        return data;
    },
};
